# Minsky engineering law: skill admission

One paragraph of `engineering.md`'s knowledge law, split out 2026-10-31 so a repo loads it by path
(apm's context round, founder's word). Org-wide.

- A skill earns its place, because every installed skill's description sits in every prompt
  whether it is used or not (about 100 tokens each, Anthropic's Agent Skills overview). A
  repeated job becomes a skill only when all five hold: it recurred in 3 or more sessions within
  14 days; code was ruled out first (files that always change together are a one-step fix in the
  code, never a skill teaching the workaround); its tokens saved per week exceed its standing
  cost per week; a small test set shows it loads on its cases and stays quiet on look-alikes;
  and it overlaps no existing skill. A skill no session loaded in 14 days, or whose job's tokens
  did not fall after it landed, is proposed for removal at the next review, and a plugin with
  no use in a repo is switched off there. The numbers decide admission and the founder sees the
  list; removal is the founder's. Enforced by a repo's transcript miner, never by this text
  (founder's word, apm 2026-10-18).
