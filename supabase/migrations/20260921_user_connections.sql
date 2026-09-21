-- Migration: Add user_connections table for per-user OAuth tokens
-- Supports GitHub and Google (Gmail + Google Docs) with encrypted token storage

CREATE TABLE IF NOT EXISTS public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'google')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scopes TEXT,
  expires_at BIGINT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  account_username TEXT,
  account_email TEXT,
  CONSTRAINT user_connections_user_provider_key UNIQUE (user_id, provider)
);

-- Index for rapid per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_connections_user_provider ON public.user_connections (user_id, provider);

-- Comments for documentation
COMMENT ON TABLE public.user_connections IS 'Stores secure per-user OAuth credentials and refresh tokens for GitHub and Google integrations.';
COMMENT ON COLUMN public.user_connections.access_token IS 'Encrypted OAuth access token using AES-256-GCM.';
COMMENT ON COLUMN public.user_connections.refresh_token IS 'Encrypted OAuth refresh token for offline re-authorization.';
