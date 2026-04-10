# Done

## Acceptance Criteria

The pre-deploy final pass is complete when:

- the whole project is reviewed for deploy readiness
- real blockers or stale docs are fixed without widening scope
- validation is rerun for the relevant local checks
- the remaining unknowns before deploy are written down explicitly

## Required Validation

- `npm run typecheck`
- `npm run build`
- `npm audit --audit-level=low`
- any additional real checks run in this session are recorded honestly
- remaining gaps, if any, are written down explicitly

## Must Be True Before Completion

- no secret is exposed to the client
- no unverified claim is presented as confirmed
- summary clearly separates:
  - what was fixed
  - what was checked
  - what still remains uncertain
