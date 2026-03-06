---
name: Fix Issue with Copilot Agent
description: >
  Automatically fixes a Storybook bug when the 'agent' label is added to an issue.
  Follows the documented fix-bug skill workflow end-to-end: plan, implement, test,
  verify (Flow 0–4), and open a PR targeting `next`.

on:
  issues:
    types: [labeled]
  roles: [admin, maintainer, write]
  status-comment: true

if: github.event.label.name == 'agent'

permissions:
  contents: read
  issues: read
  pull-requests: read

engine:
  id: copilot

tools:
  github:
    mode: remote
    toolsets: [default]
  playwright:

network:
  allowed:
    - node
    - defaults
    - playwright
    - localhost

checkout:
  fetch-depth: 0

safe-outputs:
  create-pull-request:
    base-branch: next
    labels: [agent, bug, ci:normal]
    draft: false
    if-no-changes: warn
  update-pull-request:
    body: true
    title: false
  upload-asset:
    branch: "assets/fix-issue-agent"
    allowed-exts: [.png, .jpg, .jpeg]
    max: 10
  add-comment:
    max: 5
---

# Fix Issue #${{ github.event.issue.number }} with Copilot Agent

The `agent` label was just added to issue #${{ github.event.issue.number }} in the Storybook repository.

Your task is to fix this issue end-to-end by following the documented skill workflow exactly.

## Issue Details

- **Issue number**: `${{ github.event.issue.number }}`
- **Issue title**: `${{ github.event.issue.title }}`
- **Issue URL**: `${{ github.server_url }}/${{ github.repository }}/issues/${{ github.event.issue.number }}`

## Instructions

Read the file `.claude/skills/fix-bug/SKILL.md` and follow **every step in order**. Do not skip or shortcut any step.

The fix-bug workflow consists of five steps, each referencing a sub-skill file that you must read in full before executing:

| Step | Action | Sub-skill file to read |
|------|--------|------------------------|
| 1 | Plan the fix | `.claude/skills/plan-bug-fix/SKILL.md` |
| 2 | Implement, test, verify | `.claude/skills/implement-and-verify-fix/SKILL.md` |
| 3 | Verification checklist | `.claude/skills/verification-checklist/SKILL.md` |
| 4 | Self-improve documentation | (inline in fix-bug skill) |
| 5 | Open pull request | `.claude/skills/open-pull-request/SKILL.md` |

The issue number to pass as `$ARGUMENTS[0]` throughout the skill files is: **`${{ github.event.issue.number }}`**

## Repository Context

- `code/` — Main codebase (core, addons, builders, renderers, frameworks)
- `.claude/skills/` — Workflow skill files (read all referenced files before executing their steps)
- `.github/PULL_REQUEST_TEMPLATE.md` — PR body template (every section is mandatory)
- `CLAUDE.md` — Repository-wide instructions and commands

## Key Commands

Refer to `CLAUDE.md` for all commands. Key ones:

```bash
# Compilation
yarn nx compile <package-name> --no-cloud

# Type checking
yarn nx run-many -t check -c production --no-cloud

# Testing
cd code && yarn test

# Format/lint (only at the end, not in between)
yarn prettier --write <file>
yarn --cwd code lint:js:cmd <file> --fix
```

## AWF Environment Notes

This workflow runs inside the GitHub Agentic Workflows (gh-aw) AWF sandbox. Node modules **are** pre-installed and the codebase is pre-compiled as part of the workflow setup steps. Key constraints:

- **Do NOT run `yarn install`** — packages are already installed; re-running install is unnecessary and will waste time.
- **Do NOT run `yarn task dev` or `yarn start`** — these run indefinitely.
- All compile, test, lint, and format commands work normally.

## PR Creation in This Context
## Screenshots and Visual Verification

For any verification flow that involves the Manager UI or visual output (Flow 1, 3, 4):

1. Use the **Playwright tool** to launch a Chromium browser, navigate to `http://localhost:6006`, and take screenshots
2. Save screenshots to `/tmp/` (e.g., `/tmp/before-fix.png`, `/tmp/after-fix.png`)
3. Upload each screenshot with the `upload_asset` tool — it returns a public `raw.githubusercontent.com` URL
4. Embed those URLs as Markdown images in the PR body's **Verification Evidence** section using `update_pull_request`

Example PR body snippet:
```
## Verification Evidence
**Before fix:**
![before](https://raw.githubusercontent.com/yannbf/storybook/assets/fix-issue-agent/before-fix.png)
**After fix:**
![after](https://raw.githubusercontent.com/yannbf/storybook/assets/fix-issue-agent/after-fix.png)
```

If Playwright cannot render the page (e.g., build not ready), document the code-inspection evidence instead and note why screenshots were unavailable.

This workflow runs inside GitHub Agentic Workflows (gh-aw) with read-only permissions. When the `open-pull-request` skill tells you to push the branch and create a PR:

1. Commit all your changes locally (the skill will tell you the right format)
2. Do **not** push to the remote — the `create-pull-request` safe-output handles branch creation, push, and PR opening automatically using its own scoped token
3. In your final message, output the complete PR title and body following `.github/PULL_REQUEST_TEMPLATE.md`

The `create-pull-request` safe-output is pre-configured with:
- Base branch: `next`
- Labels: `agent`, `bug`, `ci:normal`
- Draft: false

## Non-negotiables

- You MUST read each skill file before executing its steps — never rely on memory
- You MUST follow the workflow files exactly — do not improvise or shortcut steps
- You MUST NOT create a PR until all verification steps for the detected flow (0–4) are complete
- The PR body MUST satisfy every section of `.github/PULL_REQUEST_TEMPLATE.md`
- The branch created locally MUST be named `agent/fix-issue-${{ github.event.issue.number }}`
- You MUST target the `next` branch (configured automatically via safe-output)
- Do NOT run `yarn task dev` or `yarn start` (runs indefinitely)
- Do NOT run `yarn install` or any package installation commands — packages are already installed

## Success Criteria

Your job is complete only when ALL of the following are true:

- ✅ Issue understood, fix plan documented, local branch `agent/fix-issue-${{ github.event.issue.number }}` created
- ✅ Code implemented and all tests pass (`cd code && yarn test`)
- ✅ Verification completed per the flow (0–4) detected in `plan-bug-fix`
- ✅ Verification checklist passed (root cause confirmed, no regressions)
- ✅ All changes committed locally with a meaningful commit message
- ✅ PR title and body output in final message, satisfying `.github/PULL_REQUEST_TEMPLATE.md`
- ✅ PR body includes verification evidence (before/after screenshots or snapshots) and AI disclaimer
