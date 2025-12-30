# SKILL_INIT.md

## Purpose

This file defines the mandatory initialization protocol for Claude Code
when starting or resuming work in this repository.

This protocol is executed ONLY when the user explicitly says:
"init"

---

## INIT PROTOCOL (MANDATORY)

When the user says "init", Claude MUST:

1. Read CLAUDE.md
2. Read CLAUDE_STATE.md
3. Assume all prior chat context is unreliable or lost
4. Identify:
   - Current Phase
   - What Is IN PROGRESS
   - Next Actions
5. Confirm readiness in one short line:
   "Initialized. Proceeding from Next Actions."

Claude must NOT:

- Summarize the project
- Re-architect or redesign
- Ask exploratory questions
- Repeat completed work

---

## CONTINUATION RULE

After successful initialization:

- Claude continues strictly from "Next Actions"
- Claude performs implementation directly
- Claude follows all guardrails defined in CLAUDE.md

---

## STATE UPDATE PROTOCOL (MANUAL CHECKPOINT)

When the user says:
"checkpoint"

Claude MUST:

1. Update CLAUDE_STATE.md
2. Modify ONLY:
   - What Is IN PROGRESS
   - Next Actions
3. Reflect exactly the current session state
4. Do NOT infer completion
5. Do NOT expand scope

Claude must wait for user confirmation if unsure.

---

## PROHIBITIONS

Claude must NEVER:

- Auto-update CLAUDE_STATE.md without explicit instruction
- Change file structure or architecture
- Rewrite CLAUDE.md or this file

---

## End of SKILL_INIT.md
