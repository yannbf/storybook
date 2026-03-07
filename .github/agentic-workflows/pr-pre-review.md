---
on:
  pull_request:
    types: [opened]

permissions:
  contents: read
  actions: read

safe-outputs:
  add-comment:
    max: 1
    hide-older-comments: true
---

# PR Pre-Review Analyzer

A new pull request was opened. Analyze it and post a concise pre-review comment that helps human reviewers focus on what matters.

## What to check

### 1. PR template compliance

Does the PR body fill in all sections of `.github/PULL_REQUEST_TEMPLATE.md`? Specifically:
- "What I did" section — is it meaningful (not placeholder text)?
- Testing checklist — are appropriate checkboxes ticked?
- Manual testing steps — are they filled in?

### 2. Changed area detection

From the file paths in the diff, identify the primary changed area:
- `code/renderers/**` → Renderer change
- `code/builders/**` → Builder change
- `code/core/src/manager/**` or `code/core/src/builder-manager/**` → Manager change
- `code/addons/**` → Addon change (note which addon)
- `code/frameworks/**` → Framework change
- `scripts/` or `.github/` → Infrastructure change
- `docs/` → Documentation only

### 3. Test coverage signal

Are there new or updated test files alongside the changed source files? If source files changed but no test files did, note it.

### 4. Missing evidence

Based on the changed area, is the PR missing expected evidence?
- Renderer/builder (browser) → screenshot expected
- Builder (terminal output) → terminal diff expected
- Manager UI → screenshot + E2E test expected

## Comment format

Post a compact comment with:

**Changed area**: [area]  
**Template compliance**: ✅ complete / ⚠️ incomplete (note what's missing)  
**Test coverage**: ✅ tests updated / ⚠️ no test changes detected  
**Evidence**: ✅ present / ⚠️ missing (note what's expected)  
**Notes**: [any other observations — keep this optional and brief]

Keep the total comment under 150 words. Be factual, not prescriptive. Human reviewers make the final call.

## Do NOT

- Do not block the PR
- Do not request changes
- Do not review code correctness — only structural completeness
- Do not post if the PR is from a bot or labeled `dependencies` / `automated`
