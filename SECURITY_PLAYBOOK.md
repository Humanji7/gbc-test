# Security Playbook

## Purpose

This is the internal security baseline for the GBEMPIRE test project.

Use it to keep the implementation secure by default without adding unnecessary complexity.

## Threat Model

The most likely real-world failures are:

- leaked secrets
- client exposure of privileged keys
- malicious dependency updates
- compromised CI or deploy workflow
- duplicate or unsafe access to business data
- no recovery path after an incident

This playbook focuses on reducing those risks first.

## Non-Negotiables

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Never commit `.env*` files.
- Never use `NEXT_PUBLIC_*` for anything secret.
- Never install new dependencies without explicit approval.
- Never claim a security control exists unless it was verified.

## Secrets and Access

### Required

- Keep all secrets only in local env files or platform env settings.
- Use `NEXT_PUBLIC_*` only for truly public values.
- Rotate any secret immediately if it is pasted into chat, logs, screenshots, or commits.
- Use least privilege for every external integration key.

### Before Deploy

- Verify `.gitignore` excludes `.env.local`, `.env`, `.env.production`.
- Verify no secret-looking values appear in committed files.
- Verify Vercel env vars are configured only for the required environments.

## Supabase

### Required

- Use `service_role` only in server-only code.
- Use the anon key only for public browser access.
- Put Row Level Security on any table that could hold business or user data.
- Keep raw payload storage intentional and documented.

### Before Deploy

- Confirm no `service_role` usage exists in client bundles.
- Confirm table access rules are understood before exposing any read path.
- Confirm PII is masked or omitted in dashboard views where possible.

## RetailCRM and Telegram

### Required

- Store API keys and bot tokens only in env vars.
- Scope RetailCRM permissions to the minimum needed.
- Prevent duplicate Telegram notifications with persistent deduplication.
- Avoid logging full payloads that include customer contact details unless required.

### Before Deploy

- Confirm RetailCRM key only has the selected permissions.
- Confirm Telegram messages do not leak more customer data than needed.

## Dependencies and Supply Chain

### Required

- Commit and use a lockfile.
- Prefer deterministic installs.
- Avoid unnecessary packages.
- Treat postinstall/build scripts from dependencies as a risk surface.

### Recommended

- If we use `pnpm`, configure a delayed install policy such as `minimumReleaseAge`.
- Enable dependency review in GitHub before merging dependency changes.
- Review transitive dependency jumps in pull requests.

## GitHub and CI

### Required

- Protect the default branch.
- Require pull request review before merge for meaningful changes.
- Enable secret scanning and push protection.
- Keep CI permissions as narrow as possible.

### Recommended

- Pin GitHub Actions by full commit SHA.
- Enable CodeQL default setup.
- Use `CODEOWNERS` if the repo becomes shared.
- Prefer short-lived credentials over long-lived deploy tokens where available.

## Application Security

### Required

- Keep privileged operations in server handlers only.
- Validate all external inputs at runtime.
- Avoid unsafe HTML rendering.
- Do not log secrets, tokens, or raw auth headers.

### Recommended

- Add baseline security headers at deploy time.
- Rate-limit public mutation endpoints if any are exposed.
- Keep error messages useful but not secret-revealing.

## Monitoring and Recovery

### Required

- Know how to rotate every key in use.
- Know how to revoke compromised access quickly.
- Keep a simple backup and restore path for important data.

### Recommended

- Keep periodic database dumps for recovery confidence.
- Record where logs live and how incidents will be checked.
- Do at least one restore drill before trusting the backup plan.

## Pre-Deployment Checklist

- Secrets are present only in env storage, not in git.
- `service_role` is server-only.
- Public env vars contain only public values.
- Lockfile is committed.
- New dependencies were reviewed and approved.
- Telegram deduplication is implemented.
- Dashboard avoids unnecessary PII.
- Branch protection and secret scanning are enabled.
- Deployment config does not expose debug or dev-only behavior.

## Incident Response Mini-Checklist

If something looks compromised:

1. Pause deploys and merges.
2. Rotate affected secrets first.
3. Review recent dependency, CI, and env changes.
4. Check access logs and recent deploy history.
5. Restore from known-good state if needed.
6. Document what happened and what control failed.

## Working Rule

When speed and safety conflict, choose the smallest secure path that still keeps the milestone moving.
