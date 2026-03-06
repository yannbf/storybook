---
name: Flaky Test Investigations
description: >
  Runs daily to investigate flaky tests in the Storybook monorepo. Searches for
  flake signals in GitHub issues and CI, runs suspect tests locally, and opens
  PRs with fixes or tracking issues when a fix cannot be determined.

on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
  checks: read

engine: copilot

network:
  allowed:
    - defaults
    - node

tools:
  github:
    toolsets: [default]
  edit:
  bash: true
  web-fetch:
  playwright:

safe-outputs:
  create-issue:
  create-pull-request:
  add-labels:
  assign-to-agent:
---

# Flaky Test Investigations

Your goal is to identify, reproduce, and fix flaky tests in the Storybook monorepo (`storybookjs/storybook`). Work through the steps below methodically.

## Step 1 – Gather flake signals

Search for existing signals across multiple sources:

1. **GitHub Issues**: Search for open issues labelled `flaky` or containing keywords like "flake", "flakes", "flakey", "flaky", "intermittent", "race condition", "timeout", "non-deterministic". Prioritise issues with multiple reports or recent activity.
2. **Recent CI failures**: Look at the last 7 days of workflow runs on the `next` branch. Identify jobs that failed more than once with different commit SHAs — these are candidates for flaky tests. Focus on failures that are not consistent (i.e. the same job sometimes passes and sometimes fails).
3. **Pull request comments**: Search PR comments mentioning "flaky", "re-run", "intermittent failure", or similar.

Collect a ranked list of candidate flaky tests with:
- Test file path (if known)
- Failure message / error snippet
- Source (issue link, CI run link, PR link)

## Step 2 – Reproduce locally

For each candidate (up to 5 per run to keep scope manageable):

1. Check out the `next` branch: `git checkout next && git pull`.
2. Install dependencies: `yarn install --frozen-lockfile`.
3. Compile the relevant package if needed: `yarn nx compile <package-name>`.
4. Run the suspect test file **5 times** in a row using vitest:
   ```bash
   cd code && yarn vitest run --reporter=verbose <path-to-test-file>
   ```
   If any run fails, the test is confirmed flaky.
5. For E2E / browser tests using Playwright, run the test **3 times**:
   ```bash
   cd code && yarn playwright test <spec-file>
   ```

## Step 3 – Investigate root cause

For each confirmed flaky test, analyse the failure output carefully:

- **Timing issues**: Look for race conditions, missing `await`, or reliance on animation/transition durations. Fix by adding proper `waitFor` / `waitForSelector` calls or by removing hard-coded timeouts.
- **Shared state / side effects**: Check whether tests mutate global state, shared mocks, or the file system without cleanup. Fix by adding `beforeEach`/`afterEach` teardown.
- **Order dependence**: Check whether the test only fails when run alongside other tests. Fix by making the test self-contained.
- **Environment assumptions**: Check for OS- or timezone-specific behaviour, or assumptions about available ports/processes.
- **Snapshot drift**: Check for outdated snapshots; regenerate with `yarn vitest run --update-snapshots <file>`.

## Step 4 – Fix and verify

Once the root cause is understood:

1. Apply the minimal fix on a new branch: `git checkout -b fix/flaky-<short-description>`.
2. Re-run the test **10 times** to confirm it no longer fails intermittently.
3. Run the full test suite for the affected package: `cd code && yarn test`.
4. Format and lint the changed files:
   ```bash
   yarn prettier --write <file>
   yarn --cwd code lint:js:cmd <file> --fix
   ```
5. Commit the change with a clear message: `fix(tests): resolve flaky <describe test>`.

## Step 5 – Output

For **each flaky test investigated**, produce one of the following outcomes:

### If fixed
- Open a pull request targeting the `next` branch.
- Title: `Fix flaky test: <short description>`
- Body must include:
  - Summary of the flakiness (what was failing and why)
  - Root cause explanation
  - Description of the fix
  - Evidence that the test now passes reliably (paste the 10-run output)
- Add the `flaky` label to the PR.

### If not fixable (root cause unclear or fix too risky)
- Open a GitHub issue (or comment on an existing one if already tracked).
- Title: `Flaky test: <short description>`
- Body must include:
  - Affected test file and test name
  - Failure message / stack trace
  - Steps to reproduce
  - Hypothesis about the root cause
  - What was tried and why it did not work
- Add labels: `flaky`, `needs-investigation`.

## Constraints

- Only investigate tests in the `code/` directory of this monorepo.
- Do not change production source code — only test files and test utilities.
- Do not bump dependency versions as part of this workflow.
- Limit to 5 flaky test candidates per daily run to avoid excessive CI usage.
- If no flaky signals are found, output a brief summary stating that and exit cleanly.