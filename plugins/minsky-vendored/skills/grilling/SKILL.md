---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview me relentlessly about every aspect of this until we reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the environment (filesystem, tools, etc.), look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

Do not act on it until I confirm we have reached a shared understanding.

## Scenario-first framing

Frame every question for a reader who does not live in the codebase. A question must read as a logical chain, in this fixed order:

1. **Scenario.** One named person, one day, what they see on the screen, what they do next. Concrete, not abstract.
2. **Intuition.** In plain words, what the scenario shows: the user flow and why it matters to them.
3. **Rule.** The decision the scenario forces, stated as one sentence.
4. **Receipts.** Why this rule: industry or open-source references (researched and cited: doc title, path, ADR, URL), client word on record, and how the codebase architecture supports it. Say which is verified and which is inferred.
5. **Architecture.** How the rule lands in the system: entities, seams, contracts. Only after the receipts.
6. **Rejected options.** Each alternative with the reason it loses.
7. **Recommended answer.**

Any options table comes after the scenario, never first. A bare options table with no story stalls the conversation.

For a review batch (cold-review findings, audit results): tell one story per item that needs a decision, in the order above. Fold the purely mechanical items silently and list them at the end.
