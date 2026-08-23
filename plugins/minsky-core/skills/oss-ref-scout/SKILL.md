---
name: oss-ref-scout
description: Discover, vet, and shallow-clone open-source repos relevant to a domain or epic into ../open-source-refs (sibling of the repo), maintaining its REFS.md manifest. Use when entering a new problem domain, starting an epic, when the user asks "what OSS exists for X", when charting a wayfinder map in an unfamiliar domain (add a research ticket that invokes this skill), or when a study needs references the current set lacks. NOT per-issue — discovery is epic-scoped.
---

# OSS Ref Scout

Curates `../open-source-refs/` (sibling of the current repo) — the org's pattern-reference
library. Manifest: `REFS.md` there (types: **plumbing** = mechanisms / **product** =
judgment+UX). Downstream consumer: the read-the-masters skill builds per-issue reading
lists from this library — scout stocks the shelves, read-the-masters checks books out.

## Laws

1. **Search, never recall.** Model memory of "what OSS exists" is stale by construction
   (proven 2026-08-14: the entire LLM-era news-curation wave was missing from recall).
   Always run fresh web searches (Exa MCP if available, else WebSearch); include a
   recency-shaped query ("2025 2026 github").
2. **Present before cloning.** Candidates go to the user as a table — repo, stars,
   last-push recency, license, type (plumbing/product), one-line "why it earns study" —
   user picks. Exception: user pre-authorized the batch.
3. **Shallow clone only** (`git clone --depth 1`), background for big repos.
4. **Every clone gets a REFS.md row** (see format below) in the same turn.
5. Repos are references, never dependencies. Never `npm install`/`pip install` from
   them; never copy code wholesale — read for what was tried and how it's shaped, then
   build on our stack.

## REFS.md row format

One table per domain section. If REFS.md is missing, create it with this header:

```markdown
| Repo | Type | License | Why it earns study | Studied |
| ---- | ---- | ------- | ------------------ | ------- |
```

`Studied` = `no` | link to the digest/research file. A row whose repo was pruned is
deleted, with a one-line note under a `## Pruned` section (what + why), so the same
dead end isn't re-cloned next epic.

## Workflow

0. **Check REFS.md first.** The domain may already be covered; re-search only the gap.
1. Frame the domain question ("what exists for <problem>?"). 2–3 searches:
   - one describing the ideal project ("open source self-hosted X that does Y, github");
   - one recency-anchored; one adjacent-domain (the best reference is often one field
     over — entity resolution answered our story-identity question, not news tools).
2. Vet: alive (pushed <12mo unless it's a settled classic), real code (not a README
   shell), license visible. Note honestly when a space is DEAD and why (e.g. OSS social
   listening died with the 2023 API lockdowns — knowing that IS the finding).
3. Present table → user picks → clone → manifest rows.
4. If deep study is wanted, spawn Explore agents (one per theme, not per repo), briefs
   shaped as: our-context paragraph + numbered questions + "file:line receipts,
   VERIFIED vs INFERRED" + ranked takeaways. Digest results into the epic's research
   file and link it from the `Studied` column — reports in /tmp are volatile.

## Anti-patterns

- Re-searching a domain already covered in REFS.md (check it first).
- Cloning without a manifest row (the library rots into a junk drawer).
- Treating star-count as quality — a 14-star repo with clean seams (signal) can teach
  more than an 8k-star one; vet by reading, not by counting.
- Running scout per-issue. Discovery is epic-scoped; per-issue reading is
  read-the-masters' job against the already-stocked library.
