---
name: research
description: Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo. Use when the user wants a topic researched, docs or API facts gathered, or reading legwork delegated to a background agent.
---

Spin up a **background agent** to do the research, so you keep working while it reads.

Its job:

1. Investigate the question against **primary sources** — official docs, source code, specs, first-party APIs — not a secondary write-up of them. Follow every claim back to the source that owns it.
2. Write the findings to a single Markdown file, citing each claim's source.
3. Save it where the repo already keeps such notes; match the existing convention, and if there is none, put it somewhere sensible and say where.

## Tooling (binding for the background agent and for the brief that spawns it)

MCP tools are deferred: load them with `ToolSearch` before use, or they are silently absent and the agent falls back to plain web search. The brief MUST name them; the agent MUST use them in this order:

1. Installed source and docs in the repo or its clones (`node_modules/<pkg>`, `../open-source-refs`), version-exact, cited `file:line`.
2. Library docs: `mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`.
3. Code search across public repos: `mcp__exa__get_code_context_exa`.
4. The web, last: `mcp__exa__web_search_exa` to find, `mcp__exa__web_fetch_exa` to read. Plain `WebSearch` / `WebFetch` only when exa is unavailable, and say so in the file.

Every citation in the findings file records which tool produced it.

## Token budget (binding)

Reading and summarizing sources is mechanical work; judgment stays with the spawner.

1. Research agents run on a cheap model: spawn with `model: "sonnet"` (or `"haiku"` for pure page-summary scouts). The spawner audits the findings file, never re-reads the sources.
2. Prefer exa search highlights; full-fetch a page only when a claim is load-bearing enough to need the exact wording.
3. A research ticket names at most 3 or 4 subjects. More subjects = more tickets, sequenced so later ones can be cancelled when early ones answer the question.
4. Stop at the first source that answers; the lookup order is a ladder, not a checklist. Do not keep collecting confirmations after the answer is receipted.
