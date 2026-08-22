# Token map template (Gate 2)

Copy per variant. Fill every cell. Tag SRC. Resolve `⚠️`/`❌` with the human before
writing CSS. The map is the shared picture: the human correlates it to the Figma
frame, you correlate it to the CSS you will write.

```
COMPONENT: <name>  ·  variant=<variant>  ·  Figma frame: <node-id / page-N>
──────────────────────────────────────────────────────────────────────────────
STATE       COMPONENT TOKEN          → SEMANTIC                → PRIMITIVE        VALUE         SRC
──────────────────────────────────────────────────────────────────────────────
default     --<cmp>-bg               --tbn-<cmp>-<v>-bg          --color-…          oklch(…)      ✅ figma:F-N.x
hover       --<cmp>-bg-hover         --tbn-<cmp>-<v>-bg-hover    --color-…          oklch(…)      ⚠️ EXTRAPOLATED
pressed     --<cmp>-bg-pressed       --tbn-<cmp>-<v>-bg-pressed  --color-…          oklch(…)      ⚠️ EXTRAPOLATED
focus       --<cmp>-ring             --tbn-<cmp>-<v>-focus-ring  (…/0.4)            oklch(…)      ❌ MISSING
disabled    (opacity / token)       :                         :                  0.4           ⚠️ EXTRAPOLATED
fg          --<cmp>-fg               --tbn-<cmp>-<v>-contrast    --color-…          oklch(…)      ✅ figma:F-N.x
border      --<cmp>-border           --tbn-<cmp>-<v>-border      --color-…          oklch(…)      ✅ figma:F-N.x
──────────────────────────────────────────────────────────────────────────────
DIMENSIONS  height: h-?  ·  pad-x: px-?  ·  radius: rounded-?  ·  gap: gap-?  ·  icon: size-?
            (tag each ✅ figma / ⚠️ extrapolated / ❌ missing)
──────────────────────────────────────────────────────────────────────────────
MOTION      transition-duration: ?ms  ·  easing: ?  ·  press-transform: scale(?)
            (Notion/iOS bar: never magic numbers. Lean on web-animation-design skill
             for curves; tag each ✅/⚠️/❌. Extrapolated easing needs HITL too.)
──────────────────────────────────────────────────────────────────────────────
LEGEND  ✅ figma-confirmed   ⚠️ extrapolated (needs explicit OK → becomes @extrapolated marker)   ❌ missing (BLOCK: ask human)
```

## Worked example: Button, variant=primary

```
COMPONENT: Button  ·  variant=primary  ·  Figma frame: page-12 / node 3:214
──────────────────────────────────────────────────────────────────────────────
STATE       COMPONENT TOKEN          → SEMANTIC                  → PRIMITIVE         VALUE          SRC
──────────────────────────────────────────────────────────────────────────────
default     --button-bg              --tbn-btn-primary-bg          --color-brand-500   oklch(…)       ✅ figma:F-12.3
hover       --button-bg-hover        --tbn-btn-primary-bg-hover    --color-brand-400   oklch(…)       ⚠️ EXTRAPOLATED (one step lighter)
pressed     --button-bg-pressed      --tbn-btn-primary-bg-pressed  --color-brand-600   oklch(…)       ⚠️ EXTRAPOLATED (one step darker)
focus       --button-ring            --tbn-btn-primary-focus-ring  (brand-500 / 0.4)   oklch(…)       ⚠️ EXTRAPOLATED
fg          --button-fg              --tbn-btn-primary-contrast   :                   oklch(1 0 0)   ✅ figma:F-12.3
──────────────────────────────────────────────────────────────────────────────
DIMENSIONS  h-10 ✅ · px-4 ✅ · rounded-button ✅ · gap-2 ✅ · icon size-[18px] ⚠️
MOTION      100ms ⚠️ · ease-out ⚠️ · scale(0.97) ⚠️
──────────────────────────────────────────────────────────────────────────────
```

Every `⚠️` here either gets a Figma value from the human or ships as an
`@extrapolated` marker once approved. This is exactly the debt button.css carries
today: the markers make it visible and greppable.
