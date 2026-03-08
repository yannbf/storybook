---
on:
  schedule:
    - cron: "0 9 * * 1"  # every Monday at 09:00 UTC

permissions:
  contents: read
  actions: read

safe-outputs:
  add-comment:
    max: 10
    target: "*"
    hide-older-comments: true
  add-labels:
    allowed:
      - stale
    blocked:
      - "~*"
      - "*[bot]"
    max: 10
    target: "*"
---

# Stale Issue Processor

This runs weekly to identify issues that have gone stale and need attention.

**Stale** = open issue with label `needs-reproduction` OR `needs-info` that has had no new comments, commits, or label changes in the last **60 days**.

## Instructions

1. Search for open issues with `needs-reproduction` or `needs-info` labels older than 60 days without recent activity.
2. For each stale issue:
   a. Add the `stale` label.
   b. Post a single, brief comment (max 60 words) informing the author that the issue will be closed in 14 days unless updated, and what specifically is still needed (repro link, version info, etc.).
3. Do NOT comment on issues already labeled `stale`.
4. Do NOT touch issues with `pinned`, `good first issue`, `help wanted`, or `epic` labels.
5. Maximum: process 10 issues per run.

## Comment tone

- Friendly, not dismissive
- Reference the specific missing piece (repro / version info)
- Mention the 14-day grace period
- Do not use "bot" language — write naturally

## What NOT to do

- Do not close issues (this workflow only warns)
- Do not remove `needs-reproduction` / `needs-info` labels
- Do not comment on issues that have a recent reply from the original author
