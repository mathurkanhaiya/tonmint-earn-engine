import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADMIN_TELEGRAM_IDS = [2139807311];

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchTelegramUserPhoto(botToken: string, telegramId: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const data = await res.json();
    if (!data.ok || data.result.total_count === 0) return '';

    const fileId = data.result.photos[0][2]?.file_id || data.result.photos[0][0]?.file_id;
    if (!fileId) return '';

    const fileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileData = await fileRes.json();
    if (!fileData.ok) return '';

    return `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
  } catch {
    return '';
  }
}

async function fetchTelegramChat(botToken: string, telegramId: number) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${telegramId}`
    );
    const data = await res.json();
    if (!data.ok) return null;
    return data.result;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();
    console.log('telegram-auth called, initData length:', initData?.length);

    if (!initData) {
      return jsonResponse({ error: 'Missing initData' }, 400);
    }

    // Parse and validate initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckArr: string[] = [];
    params.sort();
    params.forEach((val, key) => dataCheckArr.push(`${key}=${val}`));
    const dataCheckString = dataCheckArr.join('\n');

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return jsonResponse({ error: 'Bot token not configured' }, 500);
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      console.error('Hash mismatch');
      return jsonResponse({ error: 'Invalid hash' }, 401);
    }

    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 86400) {
      return jsonResponse({ error: 'Auth data expired' }, 401);
    }

    const userDataStr = params.get('user');
    if (!userDataStr) {
      return jsonResponse({ error: 'No user data' }, 400);
    }

    const userData = JSON.parse(userDataStr);
    const telegramId = userData.id;
    const startParam = params.get('start_param') || null;
    console.log('Authenticating telegram_id:', telegramId, 'start_param:', startParam);

    // Fetch fresh data from Telegram Bot API
    const [chatData, photoUrl] = await Promise.all([
      fetchTelegramChat(botToken, telegramId),
      fetchTelegramUserPhoto(botToken, telegramId),
    ]);

    const username = chatData?.username || userData.username || '';
    const firstName = chatData?.first_name || userData.first_name || '';
    const lastName = chatData?.last_name || userData.last_name || '';
    const displayName = lastName ? `${firstName} ${lastName}` : firstName;

    console.log('TG API data - username:', username, 'name:', displayName, 'photo:', photoUrl ? 'yes' : 'no');

    // Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;
      console.log('Existing user found:', userId);

      // Sync latest TG data
      await supabase.from('profiles').update({
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: displayName,
      }).eq('user_id', userId);
    } else {
      // Create new auth user
      const email = `tg_${telegramId}@telegram.user`;
      const password = `tg_${telegramId}_${botToken.slice(0, 10)}`;

      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { telegram_id: telegramId, username, first_name: firstName },
      });

      if (authError) {
        console.error('Auth user creation failed:', authError.message);
        return jsonResponse({ error: authError.message }, 500);
      }

      userId = authData.user.id;
      console.log('New user created:', userId);

      await supabase.from('profiles').update({
        telegram_id: telegramId,
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: displayName,
      }).eq('user_id', userId);

      // Handle referral - startParam is the referrer's telegram_id
      if (startParam) {
        const referrerTelegramId = parseInt(startParam);
        if (!isNaN(referrerTelegramId) && referrerTelegramId !== telegramId) {
          console.log('Processing referral from telegram_id:', referrerTelegramId);

          const { data: referrerProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('telegram_id', referrerTelegramId)
            .single();

          if (referrerProfile) {
            await supabase.from('profiles').update({
              referred_by: referrerProfile.id,
            }).eq('user_id', userId);

            const { data: newProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('user_id', userId)
              .single();

            if (newProfile) {
              await supabase.from('referrals').insert({
                referrer_id: referrerProfile.id,
                referred_id: newProfile.id,
                level: 1,
              });
              await supabase.rpc('increment_referral_count', { profile_id: referrerProfile.id });
              console.log('Referral created successfully');
            }
          } else {
            console.log('Referrer not found for telegram_id:', referrerTelegramId);
          }
        }
      }
    }

    // Always ensure admin role is set for admin Telegram IDs (runs for both new and existing users)
    if (ADMIN_TELEGRAM_IDS.includes(telegramId)) {
      await supabase.from('user_roles').upsert(
        { user_id: userId, role: 'admin' },
        { onConflict: 'user_id,role' }
      );
      console.log('Admin role ensured for telegram_id:', telegramId);
    }

    // Sign in
    const email = `tg_${telegramId}@telegram.user`;
    const password = `tg_${telegramId}_${botToken.slice(0, 10)}`;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return jsonResponse({ error: signInError.message }, 500);
    }

    console.log('Auth complete for telegram_id:', telegramId);

    return jsonResponse({
      session: signInData.session,
      user: {
        id: userId,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        display_name: displayName,
        photo_url: photoUrl,
      },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('telegram-auth error:', msg);
    return jsonResponse({ error: msg }, 500);
  }
});
