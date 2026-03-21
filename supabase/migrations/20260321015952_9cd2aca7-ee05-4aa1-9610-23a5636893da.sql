CREATE OR REPLACE FUNCTION public.increment_referral_count(profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET referral_count = referral_count + 1
  WHERE id = profile_id;
END;
$$;