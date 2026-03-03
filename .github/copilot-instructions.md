# GitHub Copilot Instructions for Storybook

You are modifying the Storybook monorepo.

A PR is only valid when verification evidence matches the changed area.

## Repo operations quick reference (keep this practical)

### Environment

- Node: use version from `.nvmrc`
- Package manager: Yarn 4 (run via `yarn` / `corepack yarn`)
- Run commands from repo root unless specified

### High-value directories

- `code/` → main product code (core, renderers, builders, addons, frameworks)
- `scripts/` → build/testing helper scripts
- `test-storybooks/` → scenario projects
- `.github/` → CI + templates + contribution automation

### Core commands

```bash
yarn
yarn nx run-many -t compile -c production
yarn lint
yarn nx run-many -t check -c production
cd code && yarn test
```

### Sandbox/testing commands

```bash
yarn task sandbox --template react-vite/default-ts --start-from auto
yarn task e2e-tests-dev --template react-vite/default-ts --start-from auto
yarn task test-runner-dev --template react-vite/default-ts --start-from auto
```

### Important warnings

- Do not run indefinite dev commands without purpose (`yarn task dev`, `yarn start`).
- Sandboxes are generated outside repo by default: `../storybook-sandboxes/`.
- Use `-c production` for NX sandbox-related commands.

## Universal flow (always required)

After implementing a fix:

1. Run relevant automated tests and wait for completion.
2. If tests fail, fix the issue before proceeding.
3. Re-read the original issue/problem statement.
4. Confirm the fix addresses root cause (not only symptoms).
5. Only create/update PR when validation is complete and evidence is ready.

Minimum PR evidence:

- Test command(s) run
- Pass/fail summary (must be passing for affected checks)

## Scenario flows by changed area

In addition to the universal flow, run matching scenario flows based on files changed:

- `code/renderers/**` → **Flow 1 (Renderer/browser behavior)**
- `code/builders/**` with browser output impact → **Flow 2 (Builder/browser behavior)**
- `code/builders/**` with terminal output impact → **Flow 3 (Builder/terminal output)**
- `code/core/src/manager/**` or `code/core/src/builder-manager/**` → **Flow 4 (Manager UI)**

If multiple conditions apply, run all matching flows.

---

## Flow 1 — Renderer/browser behavior

Applies to renderer package changes (React, Vue3, Svelte, HTML, Preact, Web Components, Server).

Steps:

1. Create/update a template story reproducing the issue.
2. Select matching sandbox template (best fit for changed renderer):
   - React → `react-vite/default-ts`
   - Vue3 → `vue3-vite/default-ts`
   - Svelte → `svelte-vite/default-ts`
3. Generate full sandbox using NX.
4. Start sandbox Storybook dev server.
5. Use browser automation (or manual browser) to navigate to the test story.
6. Capture screenshot of fixed behavior.
7. If not fixed, iterate.

Required PR evidence:

- Screenshot showing corrected rendering in sandbox
- Note with sandbox template + story path used

---

## Flow 2 — Builder changes affecting browser output

Applies to builder changes where impact is rendering/HMR/assets behavior.

Steps:

1. Create/update template story reproducing behavior.
2. Generate full sandbox (usually `react-vite/default-ts`, or best-fit template).
3. Start sandbox Storybook dev server.
4. Verify corrected behavior in browser.
5. Capture screenshot.
6. Iterate until stable.

Required PR evidence:

- Screenshot proving corrected browser output
- Note with builder package + validated scenario

---

## Flow 3 — Builder changes affecting terminal output

Applies when the impact is in CLI/build/dev-server stdout/stderr.

Steps:

1. Use `scripts/capture-terminal-output.ts` with the relevant command.
2. If no baseline exists, capture baseline first.
3. Implement fix.
4. Capture output again using same command.
5. Diff against baseline snapshot.
6. If intended, update/commit snapshot.
7. If unexpected changes exist, iterate.

Required PR evidence:

- Diff excerpt showing intended output change
- Snapshot update committed when expected

---

## Flow 4 — Manager / builder-manager UI changes

Applies to manager-side UI and interactions.

Steps:

1. Add/update E2E test in `code/e2e-tests/` for the affected behavior.
2. Build Storybook UI locally.
3. Start Storybook UI dev server.
4. Navigate to impacted manager area.
5. Capture screenshot of corrected UI state.
6. Run E2E suite and ensure pass.

Required PR evidence:

- E2E test added/updated + passing output
- Screenshot of corrected manager UI state

---

## PR format requirements (mandatory)

Use `.github/PULL_REQUEST_TEMPLATE.md` exactly:

- Do not replace it with custom PR structure.
- Keep all template sections intact.
- Manual testing section is mandatory and must be filled.

In PR body, explicitly declare AI usage:

- Created by: <agent>
- Model: <model>

## PR writing quality

### Title

Use scoped, concise titles. Example:

- `manager: fix keyboard navigation regression in addons panel`
- `builder-vite: fix HMR invalidation when stories import CSS modules`

### "What I did"

- Start with concise summary.
- Then add a collapsible details section for implementation specifics.

### "Testing"

- Complete template checkboxes first.
- Then include all applicable evidence below (screenshots, terminal diffs, E2E output, links/artifacts).

## Pre-PR gate (must pass)

- Universal flow complete (tests pass + issue re-validated)
- Correct scenario flow(s) executed for changed files
- Required evidence attached (screenshot/diff/E2E proof)
- Testing section contains evidence below checkboxes
- `.github/PULL_REQUEST_TEMPLATE.md` used without override
- PR clearly declares agent + model
- Manual testing section completed

Do not open a PR without required evidence and template compliance.
