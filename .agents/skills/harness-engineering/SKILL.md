---
name: harness-engineering
description: Use when the user expects Codex to complete non-trivial development end-to-end with strong autonomy, verification, and iterative repair instead of stopping after partial implementation.
---

# Harness Engineering

Use this skill when the task should be carried from plan through verified completion in one pass.

## Workflow

1. Define the acceptance bar before editing.
2. Choose the smallest set of supporting skills that fit the task.
3. Build in vertical slices that can be verified.
4. Run narrow static checks early and broader checks before finishing.
5. For user-visible or runtime-visible changes, run browser or runtime verification.
6. Treat failures found during verification as part of the implementation.
7. Finish only with concrete evidence.

## Default supporting skills

- `using-agent-skills`
- `spec-driven-development`
- `planning-and-task-breakdown`
- `incremental-implementation`
- `test-driven-development`
- `code-review-and-quality`
- `debugging-and-error-recovery`

## Exit criteria

- The requested behavior is implemented.
- The relevant checks were run.
- Runtime or browser verification was run when applicable.
- Any problems found during verification were fixed or called out as external blockers.
- The final report contains evidence, not guesses.
