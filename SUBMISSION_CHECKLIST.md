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
- [x] README, HANDOFF, QA, BRIEF, DONE, and PLANS are aligned to the current pre-deploy state

## 2. Checks To Perform During Deploy

- [ ] configure required env vars on the target platform
- [ ] run the actual deploy
- [ ] confirm the public URL loads
- [ ] confirm the dashboard renders real data on the deployed app
- [ ] confirm no secret is exposed in the client
- [ ] record exactly what was checked after deploy
- [ ] update README / HANDOFF / QA with the deployed state only after it is actually verified

## 3. Final Submission Package

- [ ] repository link or code package
- [ ] public deploy URL
- [ ] README with:
  - project overview
  - stack
  - quick start
  - validation story
  - AI usage section
  - known limitations / tradeoffs
- [ ] technical spec
- [ ] honest QA status
- [ ] handoff or final summary that clearly states:
  - what works
  - what was validated
  - what was not validated

## Current Status

At the moment the project is ready for the deploy step, but the final submission is not complete yet because the public deploy URL has not been created and verified.

## Exact Next Prompt

Run Milestone 7 deploy as a narrow final step in /Users/admin/projects/gbc_test: deploy the current app without changing business logic, verify the public URL honestly, confirm env setup on the target platform, and update the final submission docs with only what was actually checked.
