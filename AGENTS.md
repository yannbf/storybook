# GitHub Copilot Instructions for Storybook

## Repository Structure

```text
storybook/                        # Yarn monorepo root
├── .github/                      # GitHub configurations and workflows
├── .nx/                          # NX workflows and configuration
├── code/                         # Main codebase
│   ├── .storybook/               # Configuration for internal UI Storybook
│   ├── core/                     # Core Storybook package
│   ├── lib/                      # Core supporting libraries
│   ├── addons/                   # Core Storybook addons
│   ├── builders/                 # Builder integrations
│   ├── renderers/                # Renderer integrations
│   ├── frameworks/               # Framework integrations
│   ├── presets/                  # Preset packages for Webpack-based integrations
│   └── sandbox/                  # Internal build artifacts (ignore)
├── scripts/                      # Build and development scripts
├── docs/                         # Documentation
├── test-storybooks/              # Test repos
└── ../storybook-sandboxes/       # Generated sandbox environments (outside repo)
```

## Essential Commands

### Compilation

```bash
yarn nx run-many -t compile
yarn nx compile <package-name>
```

### Type Checking

```bash
yarn nx run-many -t check -c production
```

### Development Server

```bash
cd code && yarn storybook:ui        # http://localhost:6006/
cd code && yarn storybook:ui:build  # Build for production
```

### Testing

```bash
cd code && yarn test
cd code && yarn test:watch
cd code && yarn storybook:vitest
```

## Commands to Avoid

- **DO NOT RUN**: `yarn task dev` or `yarn start` (runs indefinitely)

## Sandbox Location

Generated at `../storybook-sandboxes/` outside repo

## Sandbox Environments

```bash
yarn nx sandbox <template> -c production  # Creates ../storybook-sandboxes/<template>/
```

## Troubleshooting

- Storybook logs available in generated sandbox directories
- Use `--debug` flag with CLI commands for verbose output

## Code Quality & Testing

Format and lint before committing. Do not lint in-between, but only at the end:

```bash
yarn prettier --write <file>
yarn --cwd code lint:js:cmd <file> --fix
cd code && yarn test
```

**Testing:** Export tested functions, mock external dependencies, aim for 75%+ coverage, run `yarn vitest run --coverage <test-file>`

**Logging:** Use `logger` from `storybook/internal/node-logger` (Node.js) or `storybook/internal/client-logger` (browser). Never use `console.log` directly.

---

## Verification Suite

Every fix follows a **two-layer verification model**: a universal baseline (always runs) plus one or more scenario-specific escalations. Flows are not mutually exclusive — a single fix may require multiple flows. Use the issue description to determine which apply.

### Decision Tree

```
Fix implemented
    └── Flow 0: Universal — run unit tests + re-read problem
            └── Ask: does this issue have a visual impact?
                    ├── Yes → Visual evidence required
                    │         ├── code/renderers/ changed       → Flow 1: Renderer Bug
                    │         ├── code/builders/ changed        → Flow 2: Builder Frontend Bug
                    │         └── code/core/src/manager/ or
                    │             code/core/src/builder-manager/ changed → Flow 4: Manager Bug
                    │
                    └── Ask: does this issue affect Node.js terminal output?
                              └── Yes → code/builders/ changed  → Flow 3: Builder Terminal Output Bug
                                                                        └── PR opened with evidence attached
```

A fix may trigger both a visual flow **and** Flow 3 if it affects both browser output and terminal/build output.

---

### Flow 0 — Universal Verification (Always)

Applies to every fix, regardless of what changed.

1. Run the full unit test suite and wait for results.
2. If any tests fail, diagnose and fix before proceeding.
3. Re-read the original problem description in full.
4. Trace through the fix: does it address the root cause, or only a symptom?
5. If the fix is incomplete or misaligned, revise before opening a PR.

**Exit:** All unit tests pass and the fix demonstrably addresses the stated problem.

---

### Flow 1 — Renderer Bug Verification

**Trigger:** Files modified under `code/renderers/` **and** the issue has a visual impact.

1. Identify the affected renderer and create or update a template story that exercises the broken behaviour. The story lives alongside the renderer's existing template stories.
2. Choose the matching sandbox template (e.g. React → `react-vite/default-ts`, Vue 3 → `vue3-vite/default-ts`, Svelte → `svelte-vite/default-ts`).
3. Generate a full sandbox: `yarn nx sandbox <template> -c production`
4. Start the sandbox's Storybook dev server.
5. Use Browser MCP to open the running Storybook, navigate to the story, and take a screenshot.
6. If the story renders correctly, attach the screenshot to the PR description as visual evidence.
7. If the bug persists, diagnose and iterate before opening the PR.

**Exit:** Screenshot attached to PR showing the story rendering correctly in a real sandbox.

---

### Flow 2 — Builder Bug Verification (Frontend Output)

**Trigger:** Files modified under `code/builders/` **and** the issue has a visual impact (story rendering, HMR, asset loading).

1. Create or update a template story that demonstrates the affected behaviour.
2. Generate a full sandbox: `yarn nx sandbox react-vite/default-ts -c production` (or the most relevant template).
3. Start the sandbox's Storybook dev server.
4. Use Browser MCP to open the running Storybook, navigate to the relevant story, and take a screenshot.
5. Attach the screenshot to the PR description as visual evidence.

**Exit:** Screenshot attached to PR showing the correct browser output from the fixed builder.

---

### Flow 3 — Builder Bug Verification (Node.js Terminal Output)

**Trigger:** Files modified under `code/builders/` **and** the issue affects the Node.js process (build warnings, CLI output, build stats, error messages).

> Note: This flow can run alongside Flow 2 if the same fix affects both browser output and terminal output.

1. Before the fix, run the terminal output capture script against the relevant builder command to record the current (broken) baseline — if no baseline snapshot exists yet.
2. Implement the fix.
3. Run the capture script again to record the new output.
4. The script diffs the new output against the committed baseline snapshot and prints the diff.
5. Review the diff:
   - If it matches the intended fix (e.g. a warning is now gone), update the baseline snapshot and commit it alongside the fix.
   - If it contains unexpected changes, diagnose and revise the fix.
6. Include the diff output in the PR description.

**Exit:** Baseline snapshot updated (if output changed intentionally) and diff included in PR description.

---

### Flow 4 — Manager Bug Verification

**Trigger:** Files modified under `code/core/src/manager/` or `code/core/src/builder-manager/` **and** the issue has a visual impact.

1. Write or update an E2E test in `code/e2e-tests/` that covers the affected Manager UI behaviour (e.g. panel toggle, keyboard shortcut, settings dialog).
2. Build the Storybook UI: `cd code && yarn storybook:ui:build`
3. Start the Storybook UI dev server: `cd code && yarn storybook:ui`
4. Use Browser MCP to open the Manager UI and navigate to the affected area.
5. Take a screenshot showing the correct state of the Manager UI.
6. Run the E2E test suite to confirm the new or updated test passes.
7. Attach the screenshot to the PR description as visual evidence.

**Exit:** New/updated E2E test passes and screenshot attached to PR showing the Manager UI in the correct state.

---

### Flow Summary

| Flow | Trigger | Key Actions | PR Evidence |
|------|---------|-------------|-------------|
| 0 — Universal | Always | Unit tests + re-read problem | Tests pass |
| 1 — Renderer | `code/renderers/` changed + visual impact | Template story → sandbox → Browser MCP screenshot | Screenshot of story in sandbox |
| 2 — Builder (frontend) | `code/builders/` changed + visual impact | Template story → sandbox → Browser MCP screenshot | Screenshot of story in sandbox |
| 3 — Builder (terminal) | `code/builders/` changed + terminal output impact | Capture script → diff → update snapshot | Diff output in PR description |
| 4 — Manager | `code/core/src/manager/` or `builder-manager/` changed + visual impact | E2E test → start UI → Browser MCP screenshot | E2E pass + screenshot of Manager UI |

Flows 2 and 3 may both apply to the same fix. Always check the issue to determine whether the impact is visual, terminal, or both.

**important:** For making a PR, follow [Pull request template](.github/PULL_REQUEST_TEMPLATE.md)