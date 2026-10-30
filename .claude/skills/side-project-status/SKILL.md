---
name: side-project-status
description: Track the state of this side project through its .status.md file and the `sp` CLI. Use when resuming work on the project, when the user asks "where was I", "let's pick this up again", "give me a status", "update the tracking", "I'm pausing this project", when wrapping up a meaningful work session, or when the project's status changes.
---

# Side project tracking (`sp`)

This project has a `.status.md` file at its root. It is read by the `sp` CLI/TUI to give an overview of all side projects. The goal: being able to come back after two months without wondering what this was or where it stopped.

Reply in the user's language; write journal entries and notes in the language already used in `.status.md`.

## Format

```markdown
---
name: Stock-it
status: active            # active | paused | idea | done | abandoned
summary: Personal inventory app with a Go API, mobile app and MCP server
next: Wire auth into the mobile API
updated: "2026-10-03"
tags: [go, mobile]
---
## Notes

Durable context: decisions, technical choices, links, known gotchas.

## Journal

- 2026-10-03 — CRUD API done, auth remaining (newest first)
- 2026-09-12 — Started tracking
```

- **No progress percentage**: never invent one.
- `summary` = what the project is, in one sentence that makes sense to someone who forgot everything.
- `next` = the next **concrete** action (not "keep developing").
- Journal = what was done, dated, factual, 1–2 sentences per entry.
- Notes = what stays true over time (decisions, architecture, useful commands).

## Commands

```bash
sp recap                       # where was I: status, journal, commits since the last log, uncommitted files, docs
sp log "text" --next "…"       # add a journal entry (+ update next / updated)
sp log --git                   # entry built from commits since the last log
sp log "…" --status paused     # also change the status
sp set summary "…"             # fields: status, next, summary, name, tags
sp ls <dir> [--all]            # overview of all projects in a directory
```

`sp log` / `sp set` walk up parent directories to find `.status.md`, so they work from a subfolder. If `sp` is not installed, edit the file by hand following the format above.

## When to do what

### Resuming ("where was I", start of a session on this project)
1. Run `sp recap`.
2. If needed, read the listed docs (README, docs/…) and the uncommitted files.
3. Summarize in a few lines: what the project is, where it stopped, what is pending (uncommitted work, TODOs), the suggested next step.
4. If `summary` is empty or vague, propose a better one and write it with `sp set summary`.

### End of a meaningful work session
When a feature is done, a decision is made, or the user says they are stopping:
- `sp log "<what was done, factual>" --next "<next concrete step>"`.
- One entry per session rather than one per micro-change. No entry for a simple question or code reading.
- Do it without asking (it is a local, versioned file), then mention it in one line.
- A durable decision goes in `## Notes` (edit the file directly), not only in the journal.

### Status change
"I'm dropping this" → `abandoned`, "I'm pausing this" → `paused`, "it's done / shipped" → `done`. Use `sp log "<reason>" --status <status>` to keep track of why.

## Rules
- Never rewrite or delete existing journal entries; only append.
- Only change the frontmatter through `sp`, or keep exactly the keys of the format.
