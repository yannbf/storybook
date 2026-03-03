# AGENTS.md

Agent operating guide for the Storybook monorepo.

## 1) Navigate and work efficiently

Start by reading `.github/copilot-instructions.md` for repository-specific commands, structure, sandbox workflows, and constraints.

Use it as the source of truth for:
- repository layout
- compile/lint/check/test commands
- NX vs task command usage
- sandbox generation/testing patterns
- command pitfalls and long-running command cautions

## 2) Validation + evidence rules (mandatory)

A PR is valid only when verification evidence matches changed areas.

### Universal flow (always)

After implementing a fix:
1. Run relevant tests and wait for completion.
2. Fix failures before moving on.
3. Re-read the original issue.
4. Confirm root cause is addressed (not only symptoms).
5. Only open/update PR when evidence is complete.

Minimum evidence:
- test commands run
- pass/fail summary

### Scenario flows by changed files

Run all that apply:
- `code/renderers/**` → Renderer/browser validation
- `code/builders/**` affecting browser output → Builder/browser validation
- `code/builders/**` affecting terminal output → terminal snapshot/diff validation
- `code/core/src/manager/**` or `code/core/src/builder-manager/**` → Manager UI + E2E validation

### Flow-specific evidence

- **Renderer / Builder browser flows**
  - create/update repro story
  - validate in matching sandbox
  - attach screenshot proving fix
  - include sandbox template + story path in PR

- **Builder terminal-output flow**
  - use `scripts/capture-terminal-output.ts`
  - compare against baseline snapshot
  - attach intended diff excerpt

- **Manager flow**
  - add/update `code/e2e-tests/` test
  - run E2E and include passing result
  - attach screenshot of corrected manager UI

## 3) PR template compliance (mandatory)

Use `.github/PULL_REQUEST_TEMPLATE.md` exactly.
- Do not replace template sections.
- Manual testing section must always be completed.
- Include evidence below testing checkboxes.

In PR body, explicitly include AI disclosure:
- Created by: <agent>
- Model: <model>

## 4) Pre-PR gate

Before opening/updating PR, ensure:
- universal validation flow completed
- applicable scenario flows executed
- required evidence attached
- PR template fully and correctly filled
- AI disclosure included

Do not open/update PR without the required evidence and template compliance.
