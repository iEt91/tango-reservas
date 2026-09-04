AGENTS.md

Purpose

Work on this repository efficiently, accurately, and with a clear stopping condition.
Minimize unnecessary context usage, repeated repository scans, repeated commands,
redundant validation, and speculative work.

The repository state is the source of truth. Conversation history is secondary.

Scope and priorities

Complete only the task explicitly requested by the user.

Prefer the smallest correct change that satisfies the task.

Preserve existing behavior outside the requested scope.

Do not perform unrelated refactors, cleanup, redesigns, or improvements.

Do not fix unrelated warnings or pre-existing failures unless they block the task.

Direct user instructions in the current request take precedence over this file.

Initial orientation

At the beginning of a task:

Check the current repository state with Git.

Identify existing modified/untracked files before changing anything.

Inspect only the files and symbols likely related to the requested task.

Use targeted search before opening large numbers of files.

Do not scan the entire repository unless the task genuinely requires it.

Never inspect generated or dependency directories unless specifically necessary.

Avoid broad reads of directories such as:

node_modules

.next

dist

build

coverage

generated caches

large logs

Do not reread unchanged files unless new evidence makes it necessary.

Planning

For a simple task, implement directly.

For a complex task, create a short plan of no more than 3-6 concrete steps.
Do not repeatedly rewrite or expand the plan.

A plan is not progress. Prefer implementation and verification over repeated analysis.

Implementation

Make the minimum set of changes necessary.

Prefer editing existing code over introducing new abstractions without need.

Follow the architecture and conventions already present in the repository.

Do not rename, move, or reorganize unrelated files.

Do not add dependencies unless the requested task requires them.

Do not change configuration, migrations, infrastructure, or generated files unless required.

Do not repeatedly try alternative implementations after a correct solution is already working.

Anti-loop rules

These rules are mandatory.

Never run the same command more than twice without a meaningful code change,
state change, or genuinely new evidence between runs.

Never repeat the same repository-wide search if the previous result was sufficient.

Never reread the same unchanged files merely to regain confidence.

Never attempt the same fix repeatedly.

If the same error remains after two materially different fix attempts, stop iterating.

If a tool or command fails twice for the same reason, stop retrying it.

If several consecutive tool calls produce no meaningful progress, reassess once.

If reassessment produces no new actionable information, stop and report the blocker.

Do not continue working merely because additional improvements are possible.

Do not search for new work after the requested task's success criteria are met.

When blocked, report:

what is already complete;

the exact remaining blocker;

the evidence for the blocker;

the smallest next action needed.

Do not consume additional iterations trying the same thing.

Context-loss and compaction recovery

If conversation context is compacted, truncated, uncertain, contradictory, or appears
to have lost previous progress:

DO NOT restart the task from memory.
DO NOT rescan the whole repository.
DO NOT repeat completed work.

Recover state in this order:

Check Git status.

Inspect the current diff.

Inspect only the intentionally modified files.

Read .codex/TASK_STATE.md if it exists.

Compare the task state with the actual repository state.

Identify the single next unfinished action.

Continue from that point only.

Git and the current filesystem override stale conversational assumptions.

Lightweight task state

For tasks that require several implementation steps or are likely to span a long
agent session, maintain:

.codex/TASK_STATE.md

Do not create it for trivial one-step tasks.

Keep it under 30 lines and overwrite stale information instead of appending history.

It should contain only:

Goal

Success criteria

Completed

Remaining

Files intentionally modified

Current failing check or blocker

Exact next action

Do not store long explanations, command output, code snippets, or conversation history
in this file.

Update it only when task state materially changes, not after every tool call.

Command execution

Prefer targeted commands over broad commands.

Do not run interactive watch modes or persistent development servers unless required.

If a temporary long-running process is required, terminate it when its purpose is complete.

Do not repeatedly execute commands just to confirm the same result.

Avoid commands that generate huge output when a targeted or summarized form is available.

When a command emits a very large log, inspect only the relevant failure section.

Do not repeatedly reread an unchanged full log.

Validation strategy

Validation must be proportional to the change.

During implementation:

Run the smallest relevant check first.

If it fails, fix that specific failure.

Rerun only that targeted check.

Full-project validation:

Run the project's full validation suite only when the implementation is believed complete.

Do not run the full suite after every edit.

Do not separately run checks already included inside the full validation suite.

If full validation fails, isolate the specific failing check.

While fixing it, run only the targeted failing check.

After it passes, rerun the full validation suite once.

Do not rerun full validation indefinitely.

If the final full validation still fails after the allowed targeted repair cycle:

determine whether the failure was introduced by the current task;

fix it only if it is in scope and there is a clear actionable cause;

otherwise report it as a blocker or pre-existing failure and stop.

Warnings unrelated to the requested task are not a reason to expand scope.

Existing user changes

Assume pre-existing working-tree changes may belong to the user.

Never discard user changes.

Never reset or restore unrelated files.

Never overwrite unrelated modifications.

Distinguish existing changes from changes made during the current task.

If a requested edit overlaps existing work, preserve the existing intent where possible.

Git policy

Unless the user explicitly requests otherwise:

Do not create branches.

Do not commit.

Do not push.

Do not amend commits.

Do not reset the repository.

Do not force checkout files with user changes.

Git is primarily used to understand and review state.

Destructive and external actions

Unless explicitly requested, do not:

delete data;

apply production migrations;

modify remote databases;

deploy;

publish;

send messages;

change secrets;

rotate credentials;

perform irreversible external actions.

Completion criteria

A task is complete when all of the following are true:

The explicitly requested behavior or change is implemented.

The relevant targeted validation passes.

Final project validation has passed when appropriate, or a specific documented
blocker/pre-existing failure prevents it.

The final diff has been reviewed for unintended changes.

No unresolved issue introduced by the current changes remains.

Once these conditions are met, STOP.

Do not perform extra cleanup.
Do not search for additional improvements.
Do not rerun successful checks without a reason.
Do not continue consuming context after completion.

Final response

When finished, provide a concise report containing:

what changed;

the main files changed;

validation performed and result;

any blocker or pre-existing failure that remains.

Do not continue working after delivering the completion report.

## Reference-image template tasks
When implementing a UI from a template reference image:
- The reference screenshot is the absolute visual source of truth.
- Do not reinterpret or creatively improve it.
- Implement at the reference viewport first, then responsive behavior.
- Never distort raster assets; preserve aspect ratio.
- Never use object-fit: fill for reference assets.
- Never use background-size: 100% 100% for decorative images/patterns.
- Repeating patterns repeat; they are not stretched.
- Menu/gallery sample photographs are not template assets; use restaurant-configurable images in the same slots.
- Work section-by-section and validate with browser screenshots/overlay diffs.
- A visual task is not complete merely because it compiles.
