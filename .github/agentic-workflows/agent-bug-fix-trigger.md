---
on:
  issues:
    types: [labeled]

permissions:
  contents: read
  actions: read

safe-outputs:
  assign-to-agent:
    name: copilot
  add-comment:
    max: 1
  add-labels:
    allowed:
      - agent-in-progress
    blocked:
      - "~*"
      - "*[bot]"
    max: 1
---

# Agent Bug Fix Trigger

This workflow fires when any label is added to an issue.

## Pre-flight check

1. Check if the **newly added label** is `agent-fix`. If not, output `noop` — stop here.
2. Confirm the issue is **open**.
3. Confirm the issue has a **clear bug description**. It must have at minimum:
   - A description of the unexpected behavior
   - A Storybook version (or a statement that it's version-independent)
   - A renderer or area affected (React, Vue, builder, addon name, etc.)
4. If the issue is unclear or missing the above: post a comment explaining what is needed, do NOT assign the agent.

## Assign Copilot

If all checks pass:
1. Add the `agent-in-progress` label.
2. Assign the Copilot coding agent to the issue.
3. Post a brief comment (max 60 words) informing the issue author that Copilot has been assigned and will follow the repository's documented skill workflow to investigate and fix the issue.

## Agent instructions (context for Copilot)

When Copilot picks up this issue, it must:

1. Read `CLAUDE.md` at the repository root — this is the primary instruction document.
2. Read `.claude/skills/fix-bug/SKILL.md` — this is the complete end-to-end bug-fix workflow.
3. Follow every step in the skill file in order. No shortcuts.
4. Branch naming: `agent/fix-issue-[number]` (NOT `copilot/...`).
5. Do not open a PR until all verification steps for the detected flow (0–4) are complete.
