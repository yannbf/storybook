@CLAUDE.md

## GitHub Agentic Workflows (gh-aw)

This repository uses [GitHub Agentic Workflows](https://github.github.com/gh-aw/) for automated issue management, CI monitoring, and agentic code fixing. All workflow files live in `.github/agentic-workflows/`.

gh-aw workflows use a security-first model: the agent job runs with **read-only permissions**. Any write operations (comments, labels, issue creation, Copilot assignment) are declared as `safe-outputs` in the workflow frontmatter and executed by a separate, permission-controlled job — the agent never holds write access.

---

### Workflows

#### `issue-triage.md` — Auto-label new issues

**Trigger**: any new issue opened  
**Safe outputs**: `add-labels` (max 2), `add-comment` (max 1)

Classifies the issue as `bug`, `enhancement`, `documentation`, `question`, `needs-reproduction`, `needs-info`, `good first issue`, `performance`, or `maintenance`. Posts a comment only if reproduction or specific info is missing.

---

#### `ci-flake-detector.md` — Detect flaky CI failures on main/next

**Trigger**: CI or E2E Tests workflow completes on `main` or `next`  
**Safe outputs**: `create-issue` (max 3, grouped, 14-day expiry), `noop`

Analyzes failed CI runs and distinguishes flaky failures (timeouts, connection resets, Playwright instability) from real regressions. Creates `[flake]` issues only for likely flakes, grouped under a parent tracking issue.

---

#### `stale-issue-processor.md` — Weekly stale issue warning

**Trigger**: every Monday 09:00 UTC  
**Safe outputs**: `add-comment` (max 10), `add-labels` (`stale`, max 10)

Finds open issues with `needs-reproduction` or `needs-info` older than 60 days with no recent activity. Adds `stale` label and posts a friendly warning comment with a 14-day close window.

---

#### `agent-bug-fix-trigger.md` — Auto-assign Copilot on `agent-fix` label

**Trigger**: any label added to an issue  
**Safe outputs**: `assign-to-agent` (copilot), `add-comment` (max 1), `add-labels` (`agent-in-progress`)

When a maintainer adds `agent-fix` to an issue, this validates the issue is actionable and assigns the Copilot coding agent to it. Copilot then follows the skill workflow defined in `CLAUDE.md` and `.claude/skills/fix-bug/SKILL.md`.

---

#### `pr-pre-review.md` — Structural pre-review on new PRs

**Trigger**: any PR opened  
**Safe outputs**: `add-comment` (max 1)

Posts a compact comment summarizing the PR's changed area, template compliance, test coverage signal, and whether expected evidence (screenshots, diffs) is present. Helps human reviewers focus on what matters without blocking or requesting changes.

---

### Labels used by these workflows

| Label | Created by |
|---|---|
| `bug`, `enhancement`, `documentation`, `question`, `performance`, `maintenance` | issue-triage |
| `needs-reproduction`, `needs-info`, `good first issue` | issue-triage |
| `flakiness`, `ci` | ci-flake-detector |
| `stale` | stale-issue-processor |
| `agent-fix` | maintainers (manual trigger) |
| `agent-in-progress` | agent-bug-fix-trigger |

All labels in the `add-labels` safe-outputs use an explicit `allowed` list and a `blocked: ["~*", "*[bot]"]` glob guard to prevent prompt injection via label names.
