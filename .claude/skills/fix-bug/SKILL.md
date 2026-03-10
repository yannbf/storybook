---
name: fix-bug
description: Complete end-to-end workflow to fetch a GitHub issue, understand the bug, plan the fix, implement it, test it, verify it works, and prepare a PR—all in one linear process.
---

## Workflow Overview

```
Step 0: Record start time and initialize token tracking
         ↓
Step 1: /plan-bug-fix [issue-number]
         ↓ [MUST PASS: Plan complete, branch created]
Step 2: /implement-and-verify-fix
         ↓ [MUST PASS: Tests pass, evidence gathered]
Step 3: /verification-checklist
         ↓ [MUST PASS: Root cause confirmed, no regressions]
Step 4: Documentation Self-Improvement (if needed)
         ↓
Step 5: /open-pull-request [issue-number]
         ↓ [DONE: PR created with token usage + duration]
```

⚠️ **IMPORTANT**: Before starting Step 1, record your start time and begin tracking token usage. Track time and tokens **per phase** (planning, implementation, testing, verification, PR prep) so you can provide detailed breakdowns in the PR's AI disclaimer section for optimization analysis.

---

## Step 1: Understand & Plan the Fix

**Action**: Read and follow `.claude/skills/plan-bug-fix/SKILL.md` with the issue number.

That skill will:
- Fetch the GitHub issue
- Determine the verification flow (0–4)
- Create a detailed fix plan
- Create the feature branch `agent/fix-issue-[number]`

**Expected Output**:

- ✅ Issue clearly understood with full context
- ✅ Verification flow determined (0 = Pure Logic, 1 = Renderer, 2 = Builder Frontend, 3 = Builder Terminal, 4 = Manager UI)
- ✅ Feature branch created (e.g., `agent/fix-issue-12345`)
- ✅ Fix plan documented and ready to follow

**Success Criteria**:

- [ ] Issue understanding is complete and verified
- [ ] Verification flow (0–4) is clearly identified
- [ ] Feature branch created and checked out
- [ ] Fix plan is documented and ready to follow
- [ ] No blockers or unclear items remain

⚠️ **CRITICAL**: Do NOT proceed to Step 2 until all success criteria above are met.

---

## Step 2: Implement, Test, and Verify

**Action**: Read and follow `.claude/skills/implement-and-verify-fix/SKILL.md`.

That skill will:
- Implement the code fix
- Run tests and lint
- Commit the changes
- Run the flow-specific verification skill (reading its SKILL.md file)

**Expected Output**:

- ✅ Code implemented following plan
- ✅ All tests pass
- ✅ Code formatted and linted
- ✅ Changes committed to feature branch
- ✅ Verification evidence gathered (flow-specific)

**Success Criteria**:

- [ ] All tests pass (`cd code && yarn test`)
- [ ] No linting errors
- [ ] Changes committed
- [ ] Verification artifacts saved

⚠️ **CRITICAL**: Do NOT proceed to Step 3 until all success criteria above are met.

---

## Step 3: Run Verification Checklist

**Action**: Read and follow `.claude/skills/verification-checklist/SKILL.md`.

That skill confirms the fix addresses root cause, all tests pass, and no regressions were introduced.

**Expected Output**:

- ✅ All checklist items pass
- ✅ Fix addresses root cause (not just symptoms)
- ✅ No regressions

⚠️ **CRITICAL**: Do NOT proceed to Step 4 until the checklist passes.

---

## Step 4: Documentation Self-Improvement

**IMPORTANT**: Reflect on your workflow execution before opening the PR.

**Did you encounter any of these issues?**

- [ ] Instructions in CLAUDE.md were unclear, incomplete, or incorrect
- [ ] Instructions in any skill file were ambiguous or wrong
- [ ] You struggled to follow certain steps due to missing information
- [ ] You discovered better practices or approaches during implementation
- [ ] Command examples failed or needed adjustments
- [ ] Prerequisites were missing or incorrect

**If YES to any**: FIX THE DOCUMENTATION NOW in a separate commit.

**Action Steps**:

1. Identify which file needs updating (CLAUDE.md, AGENTS.md, or specific skill in `.claude/skills/`)
2. Make the fix directly in that file using edit tools
3. Create a **separate commit** for documentation improvements (do not mix with bug fix commit)
4. Commit message format: `docs(skills): [brief description of improvement]`

**What to Document** (Generic vs. Specific):

✅ **DO document** (generic, reusable patterns):
- Correct command syntax that failed first attempt (e.g., "Test command is `cd code && yarn test <file>`")
- File paths or directory structures (e.g., "Sandbox location is `../storybook-sandboxes/<template>`")
- Workflow patterns (e.g., "Always compile before testing: `yarn nx compile <package>`")
- Common gotchas (e.g., "Playwright requires `--headed` flag in Actions environment")
- Prerequisites or setup steps that were missing

❌ **DO NOT document** (hyper-specific, not reusable):
- Specific DOM selectors for one test (e.g., `.story-123 > div[data-test]`)
- Bug-specific details (e.g., "Issue #456 required changing line 89")
- One-off edge cases that won't recur

**Rationale**: Each bug fix workflow is an opportunity to improve the skills themselves. By fixing documentation issues immediately with generic, broadly applicable information, the next agent run will perform better and avoid the same pitfalls.

**Success Criteria**:

- [ ] All documentation issues identified during workflow execution are fixed (or none found)
- [ ] Documentation improvements committed separately from bug fix (if any)
- [ ] Only generic, reusable information was added (no hyper-specific details)
- [ ] Ready to proceed with PR preparation

---

## Step 5: Open Pull Request

**Action**: Read and follow `.claude/skills/open-pull-request/SKILL.md` with the issue number.

That skill will prepare the PR title and body (following `.github/PULL_REQUEST_TEMPLATE.md`) and open the PR.

**Expected Output**:

- ✅ PR title prepared (`Fix: [description]`)
- ✅ PR body complete with root cause, solution, tests, and flow-specific evidence
- ✅ AI disclaimer included
- ✅ PR created on GitHub with correct labels and issue linked
