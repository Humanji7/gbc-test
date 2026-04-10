# Submission Checklist

This file is the final checklist for the GBEMPIRE test submission.

It is split into three parts:

- what is already prepared before deploy
- what must be checked during deploy
- what should be present in the final submission package

## 1. Prepared Before Deploy

- [x] technical spec exists in `docs/technical-spec.md`
- [x] env contract exists in `.env.example`
- [x] schema exists in `supabase/schema.sql`
- [x] RLS is explicitly enabled on project tables
- [x] import script exists and uses stable `externalId`
- [x] sync script exists and is duplicate-safe on rerun
- [x] Telegram alert flow uses persistent deduplication
- [x] dashboard reads real data from Supabase
- [x] server/client boundary is explicit for privileged env usage
- [x] README, HANDOFF, QA, BRIEF, DONE, and PLANS are aligned to the current deployed state

## 2. Checks During Deploy

- [x] configure required env vars on the target platform
- [x] run the actual deploy
- [x] confirm the public URL loads
- [x] confirm the dashboard renders a real deployed page
- [x] confirm no secret is intentionally wired into client env beyond public keys
- [x] record exactly what was checked after deploy
- [x] update README / HANDOFF / QA with the deployed state only after it is actually verified

## 3. Final Submission Package

- [x] repository link or code package
- [x] public deploy URL
- [x] README with:
  - project overview
  - stack
  - quick start
  - validation story
  - AI usage section
  - known limitations / tradeoffs
- [x] technical spec
- [x] honest QA status
- [x] handoff or final summary that clearly states:
  - what works
  - what was validated
  - what was not validated

## Current Status

The project is submission-ready.

- GitHub repo: `https://github.com/Humanji7/gbc-test`
- Public URL: `https://gbc-test-rho.vercel.app`

## Exact Next Prompt

Review the final GBEMPIRE submission in /Users/admin/projects/gbc_test as an external reviewer: check the public URL, README, technical spec, scripts, and QA story for clarity and honesty, but do not change business logic unless you find a real blocker.
