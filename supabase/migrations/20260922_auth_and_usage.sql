-- Migration: Supabase Auth Profiles, Subscription Plans, Token Usage Log, and Active Sessions
-- Auto-creates profile on auth.users insert via on_auth_user_created trigger

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  work_context TEXT DEFAULT 'Full-Stack Developer',
  github_username TEXT,
  institution_or_company TEXT,
  plan_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Trigger: on_auth_user_created (auto-creates profiles row on user sign up / OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, plan_tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'builder'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    ),
    'free'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_token_limit BIGINT NOT NULL,
  max_concurrent_sessions INTEGER DEFAULT 2 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.subscription_plans (id, name, monthly_token_limit, max_concurrent_sessions)
VALUES
  ('free', 'Free Tier', 500000, 2),
  ('starter', 'Starter Builder', 1500000, 4),
  ('pro', 'Pro Builder', 5000000, 8),
  ('enterprise', 'Enterprise', 50000000, 20)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_token_limit = EXCLUDED.monthly_token_limit,
  max_concurrent_sessions = EXCLUDED.max_concurrent_sessions;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Anyone can view subscription plans'
  ) THEN
    CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
      FOR SELECT USING (true);
  END IF;
END $$;

-- 3. Token Usage Log Table
CREATE TABLE IF NOT EXISTS public.token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_credits INTEGER DEFAULT 0,
  mode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_usage_log_user_created ON public.token_usage_log(user_id, created_at);

ALTER TABLE public.token_usage_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'token_usage_log' AND policyname = 'Users can view own token usage log'
  ) THEN
    CREATE POLICY "Users can view own token usage log" ON public.token_usage_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Active Sessions Table
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT,
  device TEXT,
  browser TEXT,
  ip_address TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_active ON public.active_sessions(user_id, last_active);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'active_sessions' AND policyname = 'Users can view own active sessions'
  ) THEN
    CREATE POLICY "Users can view own active sessions" ON public.active_sessions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
