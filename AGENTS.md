@CLAUDE.md

## Automated Bug Fixing via GitHub Agentic Workflows (gh-aw)

In addition to manually assigning issues to the Copilot coding agent, this repository supports **automated issue assignment** using [GitHub Agentic Workflows](https://github.github.com/gh-aw/).

### How it works

1. A maintainer labels an issue with `agent-fix`
2. The gh-aw workflow (`.github/agentic-workflows/agent-fix-on-label.md`) triggers automatically
3. It validates the issue is actionable, then assigns the Copilot coding agent to it
4. Copilot reads `CLAUDE.md` and follows the skill-based workflow in `.claude/skills/fix-bug/SKILL.md`
5. A PR is opened automatically

### Triggering manually via comment

You can also trigger the gh-aw workflow manually. Add the `agent-fix` label directly in the GitHub issue UI.

### Workflow file

`.github/agentic-workflows/agent-fix-on-label.md`

The agent instructions in that file deliberately delegate to the skill files documented in `CLAUDE.md` — the gh-aw workflow is the **trigger layer**, the skills are the **execution layer**.
