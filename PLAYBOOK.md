# GBC Test Playbook

## Why This Exists

This file keeps the project moving in small, reviewable steps from spec to deploy without losing context between sessions.

## How We Work Together

- We keep one active milestone per session.
- I own structure, technical decisions, implementation details, validation, and risk callouts.
- You own external actions that require your accounts or judgment calls with real tradeoffs.
- We do not silently expand scope. Nice-to-haves are parked until the core path is done.
- Every session ends with three things:
  - what changed
  - what was validated
  - what the next prompt should target

## Session Cadence

1. Reconfirm the current milestone.
2. Gather only the context needed for that milestone.
3. Implement the smallest complete slice.
4. Validate that slice.
5. Record residual risks and the next step.

## Milestone Rules

- A milestone should fit in one session.
- A milestone is complete only when code, validation, and remaining risks are all clear.
- If a milestone grows too large, split it before coding.
- If external setup blocks progress, stop, document the blocker, and pivot to the next unblocked slice.

## Default Build Order

1. Specification and architecture
2. Repo scaffold and environment contract
3. Supabase schema and local scripts
4. RetailCRM import script
5. RetailCRM to Supabase sync
6. Telegram alert flow with deduplication
7. Dashboard UI
8. Deployment and end-to-end validation
9. README polish and submission package

## Decision Policy

- Prefer boring, proven tools over clever abstractions.
- Prefer server-side secrets and minimal public surface area.
- Prefer idempotent syncs and duplicate-safe notifications.
- Prefer simple deployment on free tiers over brittle automation.

## What I Will Continuously Track

- current milestone
- assumptions
- changed files
- validation run
- open risks
- next recommended prompt

## Expected Prompts From You

Use short prompts tied to the current milestone, for example:

- "Start milestone 1 and draft the technical spec."
- "Implement milestone 3."
- "Review milestone 5 against DONE.md."
- "Prepare the handoff for the next session."

## Stop Conditions

We pause and realign if:

- a new dependency is needed
- an external platform limitation changes the plan
- a security or data-exposure risk appears
- the milestone no longer fits in one session
