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

network:
  allowed:
    - node
    - defaults

checkout:
  fetch-depth: 0

safe-outputs:
  create-pull-request:
    base-branch: next
    labels: [agent, bug, ci:normal]
    draft: false
    if-no-changes: warn
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

## AWF Environment Constraints

This workflow runs inside the GitHub Agentic Workflows (gh-aw) AWF sandbox. **Node modules are NOT pre-installed** in this environment. Key constraints:

- **Do NOT run `yarn install`** — the Storybook monorepo has thousands of dependencies and package installation is blocked in the AWF sandbox (the firewall blocks npm registry HTTPS tunnels). Running `yarn install` will fail and waste the entire time budget.
- **Do NOT run `yarn nx compile`**, `yarn nx run-many`, or any command that requires `node_modules` — these will fail without packages.
- **Do NOT run `cd code && yarn test`** — requires packages to be installed.
- **Rely on CI for verification** — once you create the PR, the existing CI workflows (`copilot-verification.yml`, nx workflows) will run automatically and verify the fix. You do NOT need to run tests locally.

If you need to confirm a file change is syntactically correct, you can inspect the file directly. Do NOT attempt any npm/yarn/node commands.

## Key Commands

Refer to `CLAUDE.md` for all commands. Key ones:

```bash
# Format/lint (only at the end, not in between)
yarn prettier --write <file>
yarn --cwd code lint:js:cmd <file> --fix
```

**Note**: Compilation and testing commands (`yarn nx compile`, `yarn test`, etc.) require `node_modules` which is NOT available in this environment. Skip those steps and rely on CI.

## PR Creation in This Context

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
- Do NOT run `yarn install`, `npm install`, or any package installation commands — `node_modules` is not available in this environment and installation will fail
- Do NOT run `yarn nx compile`, `yarn nx run-many`, `cd code && yarn test`, or any command requiring `node_modules` — rely on CI for verification instead

## Success Criteria

Your job is complete only when ALL of the following are true:

- ✅ Issue understood, fix plan documented, local branch `agent/fix-issue-${{ github.event.issue.number }}` created
- ✅ Code changes implemented correctly (syntax verified by reading the file, not by running build/test commands)
- ✅ Verification completed per the flow (0–4) detected in `plan-bug-fix` (skip steps that require `node_modules`; CI will handle compilation and testing)
- ✅ Verification checklist passed (root cause confirmed, no regressions)
- ✅ All changes committed locally with a meaningful commit message
- ✅ PR title and body output in final message, satisfying `.github/PULL_REQUEST_TEMPLATE.md`
- ✅ PR body includes verification evidence (before/after screenshots or snapshots) and AI disclaimer
