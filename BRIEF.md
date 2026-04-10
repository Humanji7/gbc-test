# Brief

## Goal

Complete a final pre-deploy pass so the project can move into deploy and submission without changing business logic.

## Context

- The project is complete through Milestone 6:
  - mock order import into RetailCRM
  - RetailCRM to Supabase sync
  - duplicate-safe Telegram alerts
  - server-rendered dashboard from Supabase
- Deploy is still pending.
- This session is the last reviewable pass before deploy:
  - review the whole repo
  - fix only real pre-deploy blockers
  - verify what can be verified honestly without doing the deploy itself

## Desired Behavior

- the repo state matches the real implemented system
- obvious deploy blockers are removed
- documentation and handoff match the current pre-deploy state
- the next prompt can go straight into deploy

## Non-Goals

- no deploy in this session
- no new business logic
- no refactor pass
- no UI redesign
- no new dependencies without explicit approval

## Constraints

- keep secrets server-side only
- validate only what is actually checked
- keep the final step small and reviewable
- separate fixed issues from still-unverified external behavior
