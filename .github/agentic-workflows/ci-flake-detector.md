---
on:
  workflow_run:
    workflows:
      - "CI"
      - "E2E Tests"
    types: [completed]
    branches:
      - main
      - next

permissions:
  contents: read
  actions: read

safe-outputs:
  create-issue:
    title-prefix: "[flake] "
    labels:
      - flakiness
      - ci
      - needs-info
    max: 3
    expires: 14
    group: true
    close-older-issues: false
  noop:
    max: 1
---

# CI Flake Detector

A CI workflow run on `main` or `next` just completed. Your job is to analyze the run and determine whether any failures are likely **flaky** (non-deterministic) rather than legitimate regressions introduced by the triggering commit.

## What "flaky" means in Storybook CI

A failure is likely flaky if:
- It is in a Playwright/e2e test (timeout, element not found, navigation timeout)
- The error message contains keywords like: `timeout`, `ETIMEDOUT`, `ECONNRESET`, `socket hang up`, `net::ERR_`, `Failed to fetch`, `waitForSelector`
- The failing test passed in the previous run on the same branch
- The failure is in a known flaky test area (Playwright e2e, sandbox generation, `yarn nx run-many`)
- The commit message of the trigger commit does not relate to the test file path that failed

A failure is likely a **regression** (do NOT create a flake issue) if:
- The commit message clearly relates to the failing area
- Multiple different assertions fail in the same area
- A TypeScript/compilation error is present

## Instructions

1. Examine `${{ needs.activation.outputs.text }}` for the workflow run context.
2. If the workflow run **succeeded**, output `noop` — nothing to report.
3. If failed, classify failures:
   - If all failures look like regressions: output `noop` with a note.
   - If any failure looks flaky: create one issue per distinct flaky test or test suite.

## Issue format when creating flake issues

Each issue must include:
- **Title**: concise test name / suite name (title-prefix `[flake] ` is added automatically)
- **Body**:
  - Workflow run link
  - Failing step name
  - Error message / log excerpt (max 20 lines)
  - Branch name + triggering commit SHA
  - Classification reasoning (why this looks flaky vs regression)
  - Suggested next steps (skip list candidate? retry config? known root cause?)

Do not create duplicate issues if a `[flake]` issue for the same test already exists and is open.
