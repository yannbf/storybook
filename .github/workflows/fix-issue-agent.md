---
name: Assign Issue to Copilot
description: >
  Assigns the issue to the Copilot coding agent when the 'agent' label is added.

on:
  issues:
    types: [labeled]
  roles: [admin, maintainer, write]

if: github.event.label.name == 'agent'

permissions:
  issues: read

engine:
  id: copilot

tools:
  github:
    mode: remote
    toolsets: [default]

safe-outputs:
  assign-to-agent:
    name: copilot
    github-token: ${{ secrets.GH_AW_AGENT_TOKEN }}
---

# Assign Issue #${{ github.event.issue.number }} to Copilot

The `agent` label was just added to issue #${{ github.event.issue.number }}.

Assign this issue to the Copilot coding agent using the `assign_to_agent` tool.
