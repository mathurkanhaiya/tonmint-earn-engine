import express from 'express';
import cors from 'cors';
import { createHmac } from 'crypto';

const PORT = parseInt(process.env.API_PORT || '5001');

const ADMIN_TELEGRAM_IDS = [2139807311];

async function fetchTelegramUserPhoto(botToken, telegramId) {
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

async function fetchTelegramChat(botToken, telegramId) {
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

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/telegram-auth', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      return res.status(400).json({ error: 'Missing initData' });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckArr = [];
    params.sort();
    params.forEach((val, key) => dataCheckArr.push(`${key}=${val}`));
    const dataCheckString = dataCheckArr.join('\n');

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set');
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== hash) {
      console.error('Hash mismatch');
      return res.status(401).json({ error: 'Invalid hash' });
    }

    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 86400) {
      return res.status(401).json({ error: 'Auth data expired' });
    }

    const userDataStr = params.get('user');
    if (!userDataStr) {
      return res.status(400).json({ error: 'No user data' });
    }

    const userData = JSON.parse(userDataStr);
    const telegramId = userData.id;
    const startParam = params.get('start_param') || null;
    console.log('Authenticating telegram_id:', telegramId, 'start_param:', startParam);

    const [chatData, photoUrl] = await Promise.all([
      fetchTelegramChat(botToken, telegramId),
      fetchTelegramUserPhoto(botToken, telegramId),
    ]);

    const username = chatData?.username || userData.username || '';
    const firstName = chatData?.first_name || userData.first_name || '';
    const lastName = chatData?.last_name || userData.last_name || '';
    const displayName = lastName ? `${firstName} ${lastName}` : firstName;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Supabase not configured on server' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('telegram_id', telegramId)
      .single();

    let userId;

    if (existingProfile) {
      userId = existingProfile.user_id;
      console.log('Existing user found:', userId);

      await supabase.from('profiles').update({
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: displayName,
      }).eq('user_id', userId);
    } else {
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
        return res.status(500).json({ error: authError.message });
      }

      userId = authData.user.id;
      console.log('New user created:', userId);

      await supabase.from('profiles').update({
        telegram_id: telegramId,
        telegram_username: username,
        telegram_photo_url: photoUrl,
        display_name: displayName,
      }).eq('user_id', userId);

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
          }
        }
      }
    }

    if (ADMIN_TELEGRAM_IDS.includes(telegramId)) {
      await supabase.from('user_roles').upsert(
        { user_id: userId, role: 'admin' },
        { onConflict: 'user_id,role' }
      );
      console.log('Admin role ensured for telegram_id:', telegramId);
    }

    const email = `tg_${telegramId}@telegram.user`;
    const password = `tg_${telegramId}_${botToken.slice(0, 10)}`;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign in failed:', signInError.message);
      return res.status(500).json({ error: signInError.message });
    }

    console.log('Auth complete for telegram_id:', telegramId);

    return res.json({
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
    return res.status(500).json({ error: msg });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TonMint API server running on port ${PORT}`);
});
