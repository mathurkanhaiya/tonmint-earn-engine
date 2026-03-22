import express from 'express';
import cors from 'cors';
import { createHmac } from 'crypto';

const PORT = parseInt(process.env.API_PORT || '5001');

const ADMIN_TELEGRAM_IDS = [2139807311];

const DAILY_DROP_REWARDS = [5, 10, 15, 20, 25, 35, 50];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function sendTelegramMessage(botToken, chatId, text) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      }
    );
    const data = await res.json();
    if (!data.ok) console.error('TG sendMessage error:', data.description);
    return data.ok;
  } catch (e) {
    console.error('sendTelegramMessage failed:', e.message);
    return false;
  }
}

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

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
}

function getAnonKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

// Returns an admin (service role) Supabase client if available, null otherwise
async function getAdminClient() {
  const url = getSupabaseUrl();
  const serviceKey = getServiceKey();
  if (!url || !serviceKey) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Returns a regular anon Supabase client (always available)
async function getAnonClient() {
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  if (!url || !anonKey) throw new Error('Supabase URL/anon key not configured');
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

// Returns a Supabase client authenticated as a specific user
async function getUserClient(accessToken) {
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  if (!url || !anonKey) throw new Error('Supabase not configured');
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  return client;
}

async function safeLogActivity(client, userId, actionType, details) {
  try {
    await client.from('user_activity').insert({
      user_id: userId,
      action_type: actionType,
      details: details || {},
    });
  } catch {}
}

async function safeLogNotification(client, userId, telegramId, type, message) {
  try {
    await client.from('bot_notifications').insert({
      user_id: userId,
      telegram_id: telegramId,
      type,
      message,
    });
  } catch {}
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// ─── Telegram Auth ────────────────────────────────────────────────────────────
app.post('/api/telegram-auth', async (req, res) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'Missing initData' });

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');

    const dataCheckArr = [];
    params.sort();
    params.forEach((val, key) => dataCheckArr.push(`${key}=${val}`));
    const dataCheckString = dataCheckArr.join('\n');

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: 'Bot token not configured' });

    // Verify Telegram HMAC signature
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (computedHash !== hash) return res.status(401).json({ error: 'Invalid hash' });

    const authDate = parseInt(params.get('auth_date') || '0');
    if (Date.now() / 1000 - authDate > 86400) return res.status(401).json({ error: 'Auth data expired' });

    const userDataStr = params.get('user');
    if (!userDataStr) return res.status(400).json({ error: 'No user data' });

    const userData = JSON.parse(userDataStr);
    const telegramId = userData.id;
    const startParam = params.get('start_param') || null;
    console.log('Authenticating telegram_id:', telegramId);

    const [chatData, photoUrl] = await Promise.all([
      fetchTelegramChat(botToken, telegramId),
      fetchTelegramUserPhoto(botToken, telegramId),
    ]);

    const username = chatData?.username || userData.username || '';
    const firstName = chatData?.first_name || userData.first_name || '';
    const lastName = chatData?.last_name || userData.last_name || '';
    const displayName = lastName ? `${firstName} ${lastName}` : firstName;

    const email = `tg_${telegramId}@telegram.user`;
    const password = `tg_${telegramId}_${botToken.slice(0, 10)}`;

    // Use anon client for auth — no service role key needed
    const anonClient = await getAnonClient();

    // Try signing in first (existing user)
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });

    let session;
    let userId;
    let isNewUser = false;

    if (signInData?.session) {
      // Existing user signed in successfully
      session = signInData.session;
      userId = signInData.user.id;
    } else {
      // New user — register them
      isNewUser = true;

      // Try admin client first (preferred — skips email confirmation)
      const adminClient = await getAdminClient();

      if (adminClient) {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { telegram_id: telegramId, username, first_name: firstName },
        });
        if (authError) return res.status(500).json({ error: authError.message });
        userId = authData.user.id;

        // Sign in immediately after admin creation
        const { data: newSignIn } = await anonClient.auth.signInWithPassword({ email, password });
        session = newSignIn?.session;
      } else {
        // Fallback: use signUp (works without service role key)
        const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
          email,
          password,
          options: { data: { telegram_id: telegramId, username, first_name: firstName } },
        });

        if (signUpError) return res.status(500).json({ error: signUpError.message });

        // If email confirmation is required, try signing in anyway
        if (signUpData?.session) {
          session = signUpData.session;
          userId = signUpData.user.id;
        } else if (signUpData?.user) {
          // Email confirmation pending — attempt sign in
          const { data: retrySignIn } = await anonClient.auth.signInWithPassword({ email, password });
          session = retrySignIn?.session;
          userId = signUpData.user.id;
        }

        if (!session) {
          return res.status(500).json({
            error: 'Account created but email confirmation is required in your Supabase project. Please disable email confirmation in Authentication → Settings in your Supabase dashboard.',
          });
        }
      }
    }

    if (!session || !userId) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    // Use user-scoped client for profile operations
    const userClient = await getUserClient(session.access_token);

    // Update profile details
    await userClient.from('profiles').update({
      telegram_id: telegramId,
      telegram_username: username,
      telegram_photo_url: photoUrl,
      display_name: displayName,
    }).eq('user_id', userId);

    // Handle referral (new users only)
    if (isNewUser && startParam) {
      const referrerTelegramId = parseInt(startParam);
      if (!isNaN(referrerTelegramId) && referrerTelegramId !== telegramId) {
        const adminClient = await getAdminClient();
        const queryClient = adminClient || userClient;

        const { data: referrerProfile } = await queryClient
          .from('profiles')
          .select('id, user_id, telegram_id')
          .eq('telegram_id', referrerTelegramId)
          .single();

        if (referrerProfile) {
          await userClient.from('profiles').update({
            referred_by: referrerProfile.id,
          }).eq('user_id', userId);

          const { data: newProfile } = await userClient.from('profiles').select('id').eq('user_id', userId).single();
          if (newProfile) {
            await queryClient.from('referrals').insert({
              referrer_id: referrerProfile.id,
              referred_id: newProfile.id,
              level: 1,
            }).catch(() => {});
            await queryClient.rpc('increment_referral_count', { profile_id: referrerProfile.id }).catch(() => {});
          }

          // Notify referrer
          const referrerTgId = referrerProfile.telegram_id;
          if (referrerTgId) {
            const refMsg = `👥 <b>Referral Reward!</b>\n\n${firstName} joined TonMint using your link!\n🏆 Level 1 commission earned. Keep inviting! 🚀`;
            sendTelegramMessage(botToken, referrerTgId, refMsg).catch(() => {});
          }
        }
      }
    }

    // Grant admin role
    if (ADMIN_TELEGRAM_IDS.includes(telegramId)) {
      await userClient.from('user_roles').upsert(
        { user_id: userId, role: 'admin' },
        { onConflict: 'user_id,role' }
      ).catch(() => {});
    }

    // Welcome message for new users
    if (isNewUser) {
      const welcomeMsg = `🎉 Welcome to <b>TonMint</b>, ${firstName}!\n\nStart tapping to earn <b>$MINT</b> and withdraw in <b>TON</b>.\n\nTap every day for bonus rewards! 🚀`;
      sendTelegramMessage(botToken, telegramId, welcomeMsg).catch(() => {});
      safeLogNotification(userClient, userId, telegramId, 'welcome', welcomeMsg);
    }

    return res.json({
      session,
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
    console.error('telegram-auth error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ─── General Bot Notification ─────────────────────────────────────────────────
app.post('/api/notify', async (req, res) => {
  try {
    const { userId, telegramId, type, message, accessToken } = req.body;
    if (!userId || !telegramId || !message) return res.status(400).json({ error: 'Missing params' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.json({ sent: false, reason: 'Bot token not configured' });

    const sent = await sendTelegramMessage(botToken, telegramId, message);

    if (accessToken) {
      const client = await getUserClient(accessToken).catch(() => null);
      if (client) safeLogNotification(client, userId, telegramId, type || 'general', message);
    }

    return res.json({ sent });
  } catch (error) {
    console.error('notify error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ─── Daily Drop Claim ─────────────────────────────────────────────────────────
app.post('/api/daily-drop/claim', async (req, res) => {
  try {
    const { userId, accessToken } = req.body;
    if (!userId || !accessToken) return res.status(400).json({ error: 'Missing params' });

    // Use the user's own token — no service role key needed
    const userClient = await getUserClient(accessToken);

    // Verify token belongs to this user
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user || user.id !== userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get profile
    const { data: profile, error: profileErr } = await userClient
      .from('profiles')
      .select('id, telegram_id, display_name, mint_balance, daily_drop_claimed_at, daily_drop_streak')
      .eq('user_id', userId)
      .single();

    if (profileErr || !profile) return res.status(404).json({ error: 'Profile not found' });

    // Check if already claimed today
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const lastClaimed = profile.daily_drop_claimed_at
      ? new Date(profile.daily_drop_claimed_at).toISOString().slice(0, 10)
      : null;

    if (lastClaimed === today) {
      return res.status(400).json({ error: 'Already claimed today', alreadyClaimed: true });
    }

    // Calculate streak
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newStreak = (lastClaimed === yesterdayStr)
      ? Math.min((profile.daily_drop_streak || 0) + 1, 7)
      : 1;

    const rewardMint = DAILY_DROP_REWARDS[newStreak - 1];
    const newMintBalance = Number(profile.mint_balance) + rewardMint;

    // Update profile (user-scoped — works with RLS)
    await userClient.from('profiles').update({
      daily_drop_streak: newStreak,
      daily_drop_claimed_at: now.toISOString(),
      mint_balance: newMintBalance,
    }).eq('user_id', userId);

    // Log drop and activity
    await userClient.from('daily_drops').insert({
      user_id: userId,
      streak_day: newStreak,
      reward_mint: rewardMint,
    }).catch(() => {});

    safeLogActivity(userClient, userId, 'daily_drop', { streak_day: newStreak, reward_mint: rewardMint });

    // Send bot notification
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramId = profile.telegram_id;
    if (botToken && telegramId) {
      const nextDay = newStreak < 7 ? newStreak + 1 : 1;
      const nextReward = DAILY_DROP_REWARDS[nextDay - 1];
      const msg = `📅 <b>Daily Check-in — Day ${newStreak}!</b>\n\n🎁 Reward: <b>+${rewardMint} MINT</b>\n💎 Balance: <b>${Math.round(newMintBalance).toLocaleString()} MINT</b>\n🔥 Streak: <b>${newStreak}/7</b>\n\n🚀 Come back tomorrow for <b>${nextReward} MINT</b>!`;
      sendTelegramMessage(botToken, telegramId, msg).catch(() => {});
      safeLogNotification(userClient, userId, telegramId, 'daily_drop', msg);
    }

    return res.json({ success: true, streakDay: newStreak, rewardMint, newMintBalance });
  } catch (error) {
    console.error('daily-drop claim error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ─── Farming Complete Notification ────────────────────────────────────────────
app.post('/api/notify/farming-complete', async (req, res) => {
  try {
    const { userId, telegramId } = req.body;
    if (!userId || !telegramId) return res.status(400).json({ error: 'Missing params' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.json({ sent: false });

    const msg = `🌾 <b>Farming Complete!</b>\n\nYour $MINT is ready to harvest. Open the app and claim your rewards now!`;
    const sent = await sendTelegramMessage(botToken, telegramId, msg);

    return res.json({ sent });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── Boost Ready Notification ─────────────────────────────────────────────────
app.post('/api/notify/boost-ready', async (req, res) => {
  try {
    const { userId, telegramId } = req.body;
    if (!userId || !telegramId) return res.status(400).json({ error: 'Missing params' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.json({ sent: false });

    const msg = `⚡ <b>Your boosts are ready!</b>\n\n10 boosts have been refilled. Open the app and start tapping! 🚀`;
    const sent = await sendTelegramMessage(botToken, telegramId, msg);

    return res.json({ sent });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── Referral Notification ────────────────────────────────────────────────────
app.post('/api/notify/referral-complete', async (req, res) => {
  try {
    const { referrerId, referrerTelegramId, referredName, level } = req.body;
    if (!referrerId || !referrerTelegramId) return res.status(400).json({ error: 'Missing params' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.json({ sent: false });

    const msg = `👥 <b>Referral Reward!</b>\n\n${referredName || 'Your referral'} joined TonMint!\n🏆 Level ${level || 1} commission earned.\n\nKeep inviting friends! 🚀`;
    const sent = await sendTelegramMessage(botToken, referrerTelegramId, msg);

    return res.json({ sent });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── Notify New Task (broadcast) ─────────────────────────────────────────────
// Requires admin client (service role key) to read all users.
// Without it, returns a helpful message instead of failing silently.
app.post('/api/notify/new-task', async (req, res) => {
  try {
    const { taskTitle, taskReward } = req.body;
    if (!taskTitle) return res.status(400).json({ error: 'Missing taskTitle' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.json({ sent: false, reason: 'Bot token not configured' });

    const adminClient = await getAdminClient();
    if (!adminClient) {
      return res.json({
        sent: false,
        reason: 'Broadcast requires SUPABASE_SERVICE_ROLE_KEY. Task was created but no notifications were sent.',
      });
    }

    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, telegram_id')
      .not('telegram_id', 'is', null);

    if (!profiles?.length) return res.json({ sent: false, count: 0 });

    const msg = `🆕 <b>New Task Available!</b>\n\n📋 ${taskTitle}${taskReward ? `\n🎁 Reward: <b>+${taskReward} $MINT</b>` : ''}\n\nComplete it now and earn rewards! 🚀`;

    let count = 0;
    for (const p of profiles) {
      if (p.telegram_id) {
        const sent = await sendTelegramMessage(botToken, p.telegram_id, msg);
        if (sent) count++;
        await new Promise(r => setTimeout(r, 50));
      }
    }

    return res.json({ sent: true, count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── Daily Reminder (broadcast) ──────────────────────────────────────────────
// Requires admin client for broadcast. Without service role, sends only to admin.
app.post('/api/notify/daily-reminder', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(401).json({ error: 'Unauthorized' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.json({ sent: false });

    // Verify the requesting user is an admin
    const userClient = await getUserClient(accessToken);
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: roleData } = await userClient.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
    if (!roleData) return res.status(403).json({ error: 'Admin required' });

    const msg = `⏰ <b>Daily Reminder!</b>\n\nDon't miss today's rewards! Log in to TonMint and:\n• Claim your Daily Drop 📅\n• Farm $MINT 🌾\n• Watch ads for energy ⚡\n\nOpen the app now! 🚀`;

    const adminClient = await getAdminClient();

    if (!adminClient) {
      // No service role — send only to the admin themselves
      const { data: adminProfile } = await userClient.from('profiles').select('telegram_id').eq('user_id', user.id).single();
      if (adminProfile?.telegram_id) {
        await sendTelegramMessage(botToken, adminProfile.telegram_id, msg);
      }
      return res.json({
        sent: true,
        count: 1,
        note: 'Sent only to admin. Add SUPABASE_SERVICE_ROLE_KEY to broadcast to all users.',
      });
    }

    const { data: profiles } = await adminClient
      .from('profiles')
      .select('user_id, telegram_id')
      .not('telegram_id', 'is', null);

    if (!profiles?.length) return res.json({ sent: false, count: 0 });

    let count = 0;
    for (const p of profiles) {
      if (p.telegram_id) {
        const sent = await sendTelegramMessage(botToken, p.telegram_id, msg);
        if (sent) count++;
        await new Promise(r => setTimeout(r, 50));
      }
    }

    return res.json({ sent: true, count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TonMint API server running on port ${PORT}`);
  console.log(`  Service role key: ${getServiceKey() ? '✅ Available (full features)' : '⚠️  Not set (auth works, broadcasts limited)'}`);
});
