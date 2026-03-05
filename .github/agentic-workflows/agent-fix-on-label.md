---
on:
  issues:
    types: [labeled]

permissions:
  contents: read
  issues: read

safe-outputs:
  assign-to-agent:
    name: "copilot"
    github-token: ${{ secrets.GH_AW_AGENT_TOKEN }}
---

An issue has been labeled with `agent-fix`. Your job is to validate it is ready for automated fixing, then assign Copilot to work on it.

## Pre-flight check

Before assigning:

1. Confirm the issue label is `agent-fix` (not another label that triggered this workflow by accident).
2. Confirm the issue is open and has a clear bug description.
3. If the issue is unclear, add a comment explaining what additional info is needed and do NOT assign.

## Assign Copilot

If the issue is ready, assign the Copilot coding agent to it.

When Copilot starts, it will follow the instructions in `AGENTS.md` at the repository root, which points it to the `.claude/skills/fix-bug/SKILL.md` workflow.

That workflow will:
1. Plan the fix and create a branch (`agent/fix-issue-[number]`)
2. Implement and verify the fix following the appropriate verification flow (0–4)
3. Run tests, gather evidence
4. Open a properly formatted PR following `.github/PULL_REQUEST_TEMPLATE.md`
