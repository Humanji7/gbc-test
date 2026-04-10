# Plans

## Current Milestone

- Active: Pre-deploy final pass before Milestone 7 deploy
- Goal: check the whole project, remove real blockers, and leave a clean handoff into deploy

## Steps

### Step 1: Review the full repo

- inspect code, scripts, env contract, schema, and docs
- find inconsistencies, weak spots, and deploy blockers

### Step 2: Fix only what matters before deploy

- patch security or documentation issues that would weaken deploy readiness
- avoid business-logic changes unless a real blocker requires them

### Step 3: Revalidate and hand off

- rerun relevant local checks
- leave an honest deploy-ready verdict and the exact next deploy prompt

## Main Risks

- schema or access rules may be too permissive for public deploy
- local code may be clean while deploy env setup is still incomplete
- docs may overstate readiness if this pass is not reflected in handoff artifacts
