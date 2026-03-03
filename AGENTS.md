# AGENTS.md — Storybook Agent Guide

## 1. How to navigate and work within the codebase

Read `.github/copilot-instructions.md` first. It is the authoritative reference for:

- repository structure and key directories
- system requirements (Node.js version, package manager)
- compile, lint, type-check, and test commands
- sandbox generation and E2E task commands
- NX task runner usage and equivalents
- important warnings (long-running commands, sandbox location, NX flags)

Do not skip it. It contains the commands and context you need to work efficiently.

---

## 2. How to validate your work and share evidence

Your PR is only valid if verification evidence matches the changed area.

### Flow 0 — Universal (always required)

After implementing a fix:

1. Run relevant unit tests and wait for completion.
2. If tests fail, fix before continuing.
3. Re-read the original issue/problem statement.
4. Verify the fix addresses root cause (not just symptoms).
5. Only proceed to PR when tests pass and solution is aligned with the issue.

**Minimum PR evidence:** test command(s) and pass result summary.

---

### Scenario flows — run all that match your changed files

| Changed path | Run |
|---|---|
| `code/renderers/**` | Flow 1 |
| `code/builders/**` + browser output affected | Flow 2 |
| `code/builders/**` + terminal output affected | Flow 3 |
| `code/core/src/manager/**` or `code/core/src/builder-manager/**` | Flow 4 |

---

### Flow 1 — Renderer verification

1. Create/update a template story reproducing the bug.
2. Select matching sandbox template:
   - React → `react-vite/default-ts`
   - Vue3 → `vue3-vite/default-ts`
   - Svelte → `svelte-vite/default-ts`
   - (best-fit for other renderers)
3. Generate full sandbox using NX.
4. Start sandbox Storybook dev server.
5. Use Browser MCP to open Storybook and navigate to the test story.
6. Capture screenshot of the fixed behavior.
7. If not fixed, iterate.

**PR evidence required:**
- Screenshot of the story rendering correctly in sandbox.
- Brief note of sandbox template + story path used.

---

### Flow 2 — Builder verification (browser output)

1. Create/update template story demonstrating the behavior.
2. Generate full sandbox (typically `react-vite/default-ts`, or best-fit).
3. Start sandbox Storybook dev server.
4. Use Browser MCP to verify behavior in browser.
5. Capture screenshot.
6. Iterate until correct.

**PR evidence required:**
- Screenshot proving corrected browser output.
- Note of builder package + scenario validated.

---

### Flow 3 — Builder verification (terminal output)

1. Use `scripts/capture-terminal-output.ts` against the relevant command.
2. If no baseline exists, capture baseline first.
3. Implement fix.
4. Capture output again with same command.
5. Diff new output against baseline snapshot.
6. If diff matches intended behavior, update/commit snapshot.
7. If diff has unexpected changes, iterate.

**PR evidence required:**
- Diff excerpt showing intended output changes.
- Snapshot file update (when expected).

---

### Flow 4 — Manager verification

1. Write/update E2E test in `code/e2e-tests/` for affected interaction.
2. Build Storybook UI locally.
3. Start Storybook UI dev server.
4. Use Browser MCP to navigate to impacted Manager area.
5. Capture screenshot of correct UI state.
6. Run E2E suite and confirm test passes.

**PR evidence required:**
- E2E test added/updated and passing result.
- Screenshot of corrected Manager UI state.

---

## 3. How to fill in the PR template correctly

Use `.github/PULL_REQUEST_TEMPLATE.md` exactly.

- Do **not** replace the template with a custom format.
- Keep all template sections intact.
- The **manual instructions section is mandatory** and must be completed.

### PR title format

```
<Area>: <Fix description>
```

Examples:
- `Manager: Fix keyboard navigation regression in addons panel`
- `Builder-Vite: Fix HMR invalidation when stories import CSS modules`

### "What I did" section

- Start with an introduction saying the fix was built by AI. Then add a concise summary of what changed, giving enough change of how the issue is fixed.
- Add a collapsible details block with implementation specifics:

```markdown
<details>
<summary>Fix details</summary>

...implementation details...

</details>
```

### "Testing" section

- Fill template checkboxes first.
- Then add all applicable evidence **below** the checkboxes:
  - screenshots
  - terminal diffs
  - E2E output
  - links or artifacts

### AI disclosure (required)

Include in the PR body:

```
- Created by: <agent>
- Model: <provider/model>
```

---

## Pre-PR gate (all must be true before opening/updating PR)

- [ ] Flow 0 complete (tests pass + issue re-validated)
- [ ] Correct scenario flow(s) run based on changed files
- [ ] Required evidence attached (screenshot/diff/E2E proof)
- [ ] Testing section includes evidence below checkboxes
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` used without override
- [ ] PR clearly declares agent + model used
- [ ] Manual instructions section completed

**Do not open a PR without required evidence and template compliance.**
