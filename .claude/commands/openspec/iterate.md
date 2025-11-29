---
name: OpenSpec: Iterate
description: Quick behavior fixes or small feature additions via agile iteration with change-based spec updates.
category: OpenSpec
tags: [openspec, iterate]
---
<!-- OPENSPEC:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Scope Validation**
Before proceeding, assess if this request is suitable for agile iteration:
- **REJECT** if the change requires:
  - Large-scale refactoring across multiple systems
  - New capability specs (new `specs/<capability>/` directories)
  - Breaking changes or architectural shifts
  - Cross-cutting concerns affecting multiple capabilities
- **REJECT** and suggest traditional proposal workflow if:
  - The change spans multiple unrelated capabilities
  - It introduces new external dependencies or patterns
  - It requires design decisions before implementation
- **ACCEPT** for:
  - Behavior fixes restoring intended spec behavior
  - Small feature additions within existing capabilities
  - Debug utilities or minor enhancements
  - Clarifications or corrections to existing specs

If rejected, suggest using `/openspec:proposal` and provide a brief proposal outline.

**Steps**
1. Identify affected capabilities by running `openspec list --specs` and searching relevant specs with `rg -n "Requirement:|Scenario:" openspec/specs`.
2. Read the relevant spec files in `openspec/specs/<capability>/spec.md` to understand current behavior.
3. Inspect the codebase to identify discrepancies between spec and implementation, or locate where the small addition should go.
4. Work iteratively with the user to fix the issue or add the feature, making minimal, focused changes.
5. After user confirms the solution is acceptable, create a change following OpenSpec conventions:
   - Choose a unique verb-led `change-id` (e.g., `fix-ai-tagging-threshold`, `add-debug-logging`).
   - Scaffold `proposal.md`, `tasks.md` (mark all tasks as `- [x]` since work is already done), and spec deltas under `openspec/changes/<id>/`.
   - Write spec deltas in `changes/<id>/specs/<capability>/spec.md`:
     * For behavior fixes: Use `## MODIFIED Requirements` with complete updated requirement text and scenarios.
     * For small additions: Use `## ADDED Requirements` if adding a new requirement within existing capability, or `## MODIFIED Requirements` if extending an existing requirement.
     * Ensure every requirement has at least one `#### Scenario:` block.
   - Validate the change with `openspec validate <id> --strict` and fix any issues.
6. Summarize the change content briefly for the user (affected capabilities, key changes, spec updates).
7. After user confirms, archive the change using `openspec archive <id> --yes` to apply spec updates automatically.
8. Validate the updated specs with `openspec validate --strict` to ensure everything is correct.

**Reference**
- Use `openspec show <spec> --type spec` to review current spec state.
- Search existing requirements with `rg -n "Requirement:|Scenario:" openspec/specs` before modifying.
- Follow spec format from `openspec/AGENTS.md` for requirement wording and scenario structure.
- For change creation, refer to proposal structure in `openspec/AGENTS.md` (minimal proposal.md is acceptable for small fixes).
- Use `openspec show <id> --json --deltas-only` to verify change structure before archiving.
<!-- OPENSPEC:END -->

