import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (!initData) {
      return new Response(JSON.stringify({ error: 'Missing initData' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      return new Response(JSON.stringify({ error: 'Invalid hash' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 86400) {
      return new Response(JSON.stringify({ error: 'Auth data expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userDataStr = params.get('user');
    if (!userDataStr) {
      return new Response(JSON.stringify({ error: 'No user data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userData = JSON.parse(userDataStr);
    const telegramId = userData.id;
    const startParam = params.get('start_param') || null;

    // Fetch fresh data from Telegram Bot API
    const [chatData, photoUrl] = await Promise.all([
      fetchTelegramChat(botToken, telegramId),
      fetchTelegramUserPhoto(botToken, telegramId),
    ]);

    const username = chatData?.username || userData.username || '';
    const firstName = chatData?.first_name || userData.first_name || '';
    const lastName = chatData?.last_name || userData.last_name || '';
    const displayName = lastName ? `${firstName} ${lastName}` : firstName;

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
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = authData.user.id;

      await supabase.from('profiles').update({
        telegram_id: telegramId,
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: displayName,
      }).eq('user_id', userId);

      // Handle referral
      if (startParam && startParam !== String(telegramId)) {
        const { data: referrerProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('telegram_id', parseInt(startParam))
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
          }
        }
      }

      // Admin check
      if (telegramId === 2139807311) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'admin',
        });
      }
    }

    // Sign in
    const email = `tg_${telegramId}@telegram.user`;
    const password = `tg_${telegramId}_${botToken.slice(0, 10)}`;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return new Response(JSON.stringify({ error: signInError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      session: signInData.session,
      user: {
        id: userId,
        telegram_id: telegramId,
        username,
        first_name: firstName,
        display_name: displayName,
        photo_url: photoUrl,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
