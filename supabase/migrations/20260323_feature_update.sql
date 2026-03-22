-- Daily Drop columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_drop_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_drop_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boost_count INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS boost_last_refill_at TIMESTAMPTZ;

-- Bot notifications log
CREATE TABLE IF NOT EXISTS public.bot_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_id BIGINT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view notifications" ON public.bot_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Daily drop history
CREATE TABLE IF NOT EXISTS public.daily_drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  streak_day INTEGER NOT NULL,
  reward_mint NUMERIC NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own drops" ON public.daily_drops FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own drops" ON public.daily_drops FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage drops" ON public.daily_drops FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_daily_drops_user_id ON public.daily_drops(user_id);

-- Boost usage log
CREATE TABLE IF NOT EXISTS public.boost_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  boosts_used INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'tap',
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boost_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own boosts" ON public.boost_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own boosts" ON public.boost_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage boosts" ON public.boost_usage FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User activity log (for admin panel)
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view activity" ON public.user_activity FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own activity" ON public.user_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(action_type);
