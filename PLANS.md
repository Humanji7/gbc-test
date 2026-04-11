# Plans

## Current Milestone

- Active: Release closure and production deploy
- Goal: confirm the brief-aligned build still works, refresh production, and finalize reviewer-facing state

## Milestones

### Milestone A: Revalidate local and live behavior

- rerun typecheck, build, and audit
- rerun import, sync, and alerts against the existing live state
- record the current duplicate-safe outcomes honestly

### Milestone B: Refresh production

- deploy the current repository state to Vercel production
- inspect deployment readiness and alias state
- verify public `/` and `/api/health`

### Milestone C: Close the repository state

- update README, QA, handoff, and planning notes
- keep the final story short, honest, and reviewer-friendly

## Likely Affected Files

- `README.md`
- `QA.md`
- `HANDOFF.md`
- `BRIEF.md`
- `DONE.md`
- `PLANS.md`

## Validation Per Milestone

- Milestone A:
  - `typecheck`, `build`, and `audit` pass
  - import reruns show `skipped_existing=50`
  - sync reruns show `updated_orders=50`, `updated_items=81`, no duplicate inserts
  - alert reruns show `skipped_sent=6`
- Milestone B:
  - new production deployment is `Ready`
  - production alias responds
  - public page still shows 50 orders and the chart
- Milestone C:
  - docs reflect the latest release pass honestly

## Main Risks

- current live alert state no longer demonstrates first-send behavior in this session because the 6 qualifying orders are already marked sent
- sync reruns remain duplicate-safe but still rewrite the same rows as updates
- reviewer trust can drop if docs imply “fresh sends” when the latest rerun actually verified duplicate-safe skips
