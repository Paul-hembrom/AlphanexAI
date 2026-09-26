# GitHub connector (Grok-style)

Login with GitHub and the GitHub *connector* are not the same thing.

## How Grok does it
1. You have an app account (identity).
2. You separately connect GitHub with repo scopes.
3. That access token is stored server-side on *your* user id.
4. When you paste a repo URL or ask the agent to read code, tools use that token.

## What was broken in AlphanexAI
- Sign-in GitHub OAuth only requested `read:user user:email` and never saved `session.provider_token`.
- Connector UI claimed GitHub was connected even with no token.
- `executeGitHubAction` returned fake `nepal-devs/fintech-core` repos on every failure.
- MCP used only `process.env.GITHUB_TOKEN`, not the per-user OAuth token.
- Tokens saved under `usr_guest_local` never matched the Supabase user id.
- Local `.data/user_connections.json` does not persist on Vercel. Supabase `user_connections` + `SUPABASE_SERVICE_ROLE_KEY` is required.

## Required env (Vercel)
- `SUPABASE_PUBLIC_URL`
- `SUPABASE_PUBLIC_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required to persist encrypted tokens)
- `ENCRYPTION_SECRET` and `STATE_SECRET` (stable secrets, not the example defaults)
- `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` for the connector app
- Callback URL on the GitHub OAuth App: `https://<your-domain>/api/auth/github/callback`
- `APP_URL` must be that same production origin

## Supabase Auth GitHub provider
In Supabase Authentication → Providers → GitHub, add scopes:
`read:user user:email repo`

Without `repo`, login succeeds but private repos and many list endpoints fail.

## User flow after this fix
1. Sign in (Google, GitHub, or email).
2. Open Connectors → GitHub → Connect OAuth (or paste a PAT with `repo`).
3. Browse repos / attach files, or paste a `https://github.com/owner/repo` link in chat.
