-- Migration: Build Mode Pass Log and Quota Enforcement
-- Records daily build stage executions (generate, test, repair, polish)
-- for quota enforcement in Nepal Time (UTC+05:45).

CREATE TABLE IF NOT EXISTS public.build_pass_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  model_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_build_pass_log_user_created ON public.build_pass_log(user_id, created_at);

ALTER TABLE public.build_pass_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'build_pass_log' AND policyname = 'Users can view own build pass log'
  ) THEN
    CREATE POLICY "Users can view own build pass log" ON public.build_pass_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
