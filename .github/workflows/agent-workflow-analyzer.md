---
on:
  issues:
    types: [labeled]

permissions:
  contents: read
  issues: read

safe-outputs:
  add-comment:
    max: 1
  add-labels:
    allowed:
      - flow-0-quick-fix
      - flow-1-renderer
      - flow-2-builder-frontend
      - flow-3-builder-terminal
      - flow-4-manager-ui
      - agent-ready
      - needs-clarification
    max: 2
  assign-to-agent:
    name: copilot
---

# Agent Workflow Analyzer

This workflow analyzes bug reports and determines the appropriate verification flow before assigning the Copilot coding agent.

## Pre-flight Check

1. Check if the **newly added label** is `agent-workflow`. If not, output `noop` — stop here.
2. Confirm the issue is **open**.
3. Verify the issue has enough information to determine a flow:
   - Bug description with unexpected behavior
   - File paths, error messages, or affected area mentioned
   - Reproduction steps or context

If the issue lacks clarity, post a comment requesting more information and add `needs-clarification` label. Do NOT assign the agent.

## Analysis Phase

Analyze the issue content to determine the verification flow. Use these criteria:

### Flow 0: Quick Fix (No Runtime Testing)
**Indicators**:
- Documentation changes only (*.md files)
- TypeScript types/interfaces only (*.ts, no runtime code)
- Config files (tsconfig, package.json metadata)
- Simple constant/string changes
- Typos, links, comments

**File paths**: `docs/`, `*.md`, type-only changes

---

### Flow 1: Renderer Bug (Visual Verification)
**Indicators**:
- Issue mentions specific renderer: React, Vue, Angular, Svelte, Web Components, Solid, Qwik, Preact
- File paths in `code/renderers/**`
- Visual rendering problems (components not showing, styling issues)
- Story rendering behavior
- Decorators, loaders, or render functions

**Keywords**: "doesn't render", "story shows", "component displays", "canvas", "decorator"

---

### Flow 2: Builder Bug (Frontend Output)
**Indicators**:
- Builder-related: Vite, Webpack, esbuild, Rspack
- File paths in `code/builders/**`
- Issues with **JavaScript output** (bundle size, module resolution, imports/exports)
- HMR (Hot Module Replacement) problems
- Asset handling, public directory
- Preview iframe behavior

**Keywords**: "build fails", "bundle", "import error", "module not found", "vite", "webpack", "preview"

**Not Flow 2**: Terminal errors, compilation logs → that's Flow 3

---

### Flow 3: Builder Bug (Terminal Output)
**Indicators**:
- File paths in `code/builders/**`
- **Terminal/console output** verification needed
- Compilation warnings or errors shown in stdout/stderr
- Build process messages
- CLI output differences

**Keywords**: "warning in console", "error message shows", "terminal output", "build log", "compilation error"

---

### Flow 4: Manager UI Bug (E2E Testing)
**Indicators**:
- Storybook Manager UI (left sidebar, toolbar, addons panel)
- File paths: `code/core/src/manager/**`, `code/core/src/builder-manager/**`
- Navigation, search, keyboard shortcuts
- Addon panel interactions
- UI controls, buttons, modals

**Keywords**: "sidebar", "toolbar", "addon panel", "manager", "UI", "navigation", "search"

---

## Decision Logic

1. **Check file paths first** — they're the strongest signal
2. **Look for renderer names** — React/Vue/Angular/etc. → Flow 1
3. **Distinguish builder issues**:
   - Frontend/runtime/JS output → Flow 2
   - Terminal/compilation messages → Flow 3
4. **Manager UI keywords** → Flow 4
5. **No runtime impact** → Flow 0

If multiple flows could apply, prefer the more specific one:
- Renderer-specific issue → Flow 1 (even if it involves building)
- Manager UI issue → Flow 4 (even if it's in a builder context)

If genuinely ambiguous, default to Flow 2 and note the ambiguity in your comment.

---

## Output: Structured Comment

Post a comment with this format (adapt based on determined flow):

```markdown
🤖 **Workflow Analysis Complete**

**Determined Flow**: `Flow [X] - [Flow Name]`

**Rationale**: [1-2 sentences explaining why this flow was chosen]

**Affected Area**: `[file paths or package names]`

**Verification Approach**:
- [Key verification step 1]
- [Key verification step 2]
- [Expected outcome]

**Instructions for @copilot**:
1. Read `CLAUDE.md` at repository root
2. Follow `.claude/skills/fix-bug/SKILL.md` — complete end-to-end workflow
3. Execute all steps in order, including verification for Flow [X]
4. When creating the PR:
   - Apply labels: `agent`, `bug`, `ci:normal`
   - Post a comment with the same content as the PR body
   - Include token/time breakdowns in AI disclaimer
5. All detailed requirements are in the skill files

**Special Considerations**: [Any warnings, edge cases, or important notes]

---
*Automated analysis by agent-workflow-analyzer • [Flow determination guide](.claude/skills/plan-bug-fix/SKILL.md)*
```

## Output: Labels

Add TWO labels:
1. The specific flow label: `flow-0-quick-fix`, `flow-1-renderer`, `flow-2-builder-frontend`, `flow-3-builder-terminal`, or `flow-4-manager-ui`
2. The ready marker: `agent-ready`

## Output: Assign Agent

Assign the Copilot coding agent to the issue.

---

## Edge Cases

**Issue mentions multiple areas**: Choose the primary affected area. If a renderer bug also requires builder changes, it's still Flow 1 because the verification is visual.

**Unclear or insufficient information**: Do NOT guess. Post a comment asking for:
- Specific file paths or package names
- Whether the issue is visual, terminal output, or UI behavior
- Reproduction steps

Add `needs-clarification` label and do NOT assign the agent.

**Non-bug issues** (features, questions): This workflow is for bugs only. If the issue is not a bug, post a polite comment explaining that `agent-workflow` is for bug fixes, not enhancements.

---

## Context Awareness

You have `contents: read` permission. Use it to:
- Verify mentioned file paths exist
- Check if files are in the expected locations
- Confirm package names are correct

This helps you provide accurate file paths in your analysis comment.
