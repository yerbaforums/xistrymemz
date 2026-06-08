# Pass Strategy Playbook

> Formal pattern for executing incremental improvement passes.
> Trigger: user says "new pass", "continue pass", "go", or a phase number.

## The 7-Step Pass Cycle

### 1. Init
- User announces intent (phase number, "cleanup", "polish", etc.)
- Confirm scope, surface tradeoffs, ask clarifying questions
- Load current todo list and plan files

### 2. Audit
- Read PRIORITY_LIST.md, IMPROVEMENT_PLAN.md, SESSION_NOTES.md
- Grep codebase for each claimed completion — mark PASS / FAIL
- Note pre-existing issues discovered incidentally (do not fix yet)

### 3. Re-plan
- Update PRIORITY_LIST.md checkboxes to reflect actual state
- Re-score IMPROVEMENT_PLAN.md tables with real completion
- Reorder remaining work by current priority
- Update SESSION_NOTES.md with refreshed audit findings

### 4. Execute
- Batch by theme: fix breaks → component optimization → pattern replacement
- One conceptual change per file (or grouped if same pattern across files)
- Use `edit` for surgical changes; avoid rewriting entire files
- Work from highest user impact to lowest

### 5. Verify
- Run `tsc --noEmit` after every execute batch
- Run `next build` before declaring pass done
- If errors: fix immediately, do not defer

### 6. Document
- Update SESSION_NOTES.md with: completed items, key decisions, blocked items, next steps
- Mark completed, advance in-progress, log cancellations with reasoning
- Ensure PRIORITY_LIST.md checkboxes match actual state

### 7. Close
- Ask user if they want to commit (never commit unprompted)
- Ask if they want to initiate the next pass

## Conventions

| Convention | Rule |
|---|---|
| Plan files are source of truth | Update *before* writing code |
| Audit first, touch nothing | Establishes what actually needs doing |
| Batch similar edits | All `React.memo()` in one go, all `Loading...` in one pass |
| Verify after each batch | tsc after changes, not at the very end |
| Document cancellations | Log why something was skipped, not just what was done |
| Never commit unprompted | Always ask user first |
