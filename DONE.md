# Done

## Acceptance Criteria

The release-closure pass is complete when:

- `npm run typecheck` passes
- `npm run build` passes
- `npm audit --audit-level=low` reports no vulnerabilities
- live import rerun confirms the 50 fixture orders are stable and not duplicated
- live sync rerun confirms the 50 orders / 81 items path remains duplicate-safe
- live alert rerun confirms the 6 qualifying orders stay duplicate-safe in the current sent state
- a fresh production deployment is ready on Vercel
- the public dashboard and `/api/health` both respond successfully
- reviewer-facing docs match the latest release pass honestly

## Required Validation

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- `npm run import:mock-orders`
- immediate rerun of `npm run import:mock-orders`
- `npm run sync:retailcrm-to-supabase`
- immediate rerun of `npm run sync:retailcrm-to-supabase`
- `npm run alerts:telegram`
- immediate rerun of `npm run alerts:telegram`
- `vercel --prod`
- deployed `/` smoke check
- deployed `/api/health` smoke check
- deployed browser pass with no page errors

## Must Be True Before Completion

- no secret is exposed to the client
- the public dashboard still reads real Supabase-backed data
- the brief threshold remains strict `> 50_000`
- the validation summary clearly distinguishes:
  - current reruns
  - historical earlier evidence
  - remaining residual risk
