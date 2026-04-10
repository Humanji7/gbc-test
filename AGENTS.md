# Repository Operating Contract

This repository is for the GBEMPIRE AI Tools Specialist test project.

Follow the global Codex operating rules first. Then follow this file for repo-specific execution.

## Goal

Build a compact, secure, reviewable integration project that:

- imports mock orders into RetailCRM
- syncs RetailCRM orders into Supabase
- shows core business metrics in a deployed dashboard
- sends duplicate-safe Telegram alerts for high-value orders

## Project Context

- This test is judged in the context of AI tools, automation, and practical e-commerce operations.
- The solution should optimize for clarity, correctness, lightweight architecture, and honest tradeoffs.
- The repository should stay understandable from the first file to the final README.

## Core Constraints

- Work one milestone per session.
- Do not silently expand scope beyond the active milestone.
- Prefer boring, proven tools over clever abstractions.
- Keep dependencies minimal. Any new dependency requires explicit approval if it is not already present.
- Keep privileged credentials server-side only.
- Prefer free-tier-friendly design choices.

## Approved Architecture Direction

Default target stack unless a milestone explicitly changes it:

- Next.js
- TypeScript
- Supabase
- RetailCRM API
- Telegram Bot API

Avoid introducing:

- extra services not required by the test
- multi-repo splits
- background infrastructure beyond the simplest workable path
- client-side use of privileged Supabase or CRM credentials

## Execution Model

For each session:

1. Confirm the active milestone.
2. Gather only the context needed for that milestone.
3. Implement the smallest complete slice.
4. Validate that slice.
5. Record:
   - what changed
   - what was validated
   - remaining risks or blockers
   - the next recommended prompt

If a milestone grows too large, split it before coding.

## Validation Rules

- Validation must match the milestone that changed.
- Do not claim behavior as verified unless it was actually tested.
- Separate changed code from validated behavior in summaries.
- If an external dependency blocks validation, say exactly what was not verified.

Expected validation by area:

- schema work: schema applies cleanly and tables match intended flow
- import work: orders appear in RetailCRM and rerun behavior is clear
- sync work: Supabase rows match sampled RetailCRM source data
- Telegram work: a qualifying order sends one message only
- dashboard work: page renders real data from Supabase
- deploy work: public URL loads and the documented flow is reproducible

## Security Rules

- Never expose `service_role` or any other privileged key to the client.
- Use server-side reads and writes for privileged operations.
- Keep Telegram notifications duplicate-safe.
- Mask or minimize personal data in the dashboard where possible.
- Document any unavoidable tradeoff explicitly.

## Process Rules

- Use `PLAYBOOK.md`, `BRIEF.md`, `DONE.md`, `PLANS.md`, and `SECURITY_PLAYBOOK.md` as the execution source of truth.
- Park nice-to-haves instead of implementing them opportunistically.
- If platform limits change the plan, pause and realign before broad edits.
- If a new dependency is needed, stop and propose it before installation.
- Before any public deploy, check the security pre-deployment checklist.

## Non-Goals

- Building a generalized analytics platform
- Over-designing the UI
- Adding auth, queues, ORMs, or extra infra without clear need
- Hiding rough edges instead of documenting them honestly

## Preferred Deliverable Quality

The finished project should read like a small, production-minded internal integration:

- secure by default
- lightweight
- idempotent where it matters
- easy to review
- clearly documented

## Handoff Standard

At the end of each meaningful session, leave enough context for the next one to continue quickly:

- active milestone status
- changed files
- validation run
- open risks
- next recommended prompt
