import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Parse initData
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    // Sort and create data check string
    const dataCheckArr: string[] = [];
    params.sort();
    params.forEach((val, key) => dataCheckArr.push(`${key}=${val}`));
    const dataCheckString = dataCheckArr.join('\n');

    // Validate hash using bot token
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

    // Check auth_date is not too old (allow 1 day)
    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 86400) {
      return new Response(JSON.stringify({ error: 'Auth data expired' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract user data
    const userDataStr = params.get('user');
    if (!userDataStr) {
      return new Response(JSON.stringify({ error: 'No user data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userData = JSON.parse(userDataStr);
    const telegramId = userData.id;
    const username = userData.username || '';
    const firstName = userData.first_name || '';
    const photoUrl = userData.photo_url || '';
    const startParam = params.get('start_param') || null;

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists by telegram_id
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.user_id;

      // Update profile info
      await supabase.from('profiles').update({
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: firstName,
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

      // Update profile with telegram data
      await supabase.from('profiles').update({
        telegram_id: telegramId,
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: firstName,
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

            // Increment referral count
            await supabase.rpc('increment_referral_count', { profile_id: referrerProfile.id });
          }
        }
      }

      // Check if this is the admin telegram ID
      if (telegramId === 2139807311) {
        await supabase.from('user_roles').insert({
          user_id: userId,
          role: 'admin',
        });
      }
    }

    // Sign in the user to get a session token
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
