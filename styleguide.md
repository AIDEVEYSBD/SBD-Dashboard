# SBD Metrics — Style Guide

A warm, editorial design system for a GRC cybersecurity-assessment dashboard. Built for analysts running assessments and the client stakeholders they report to.

**Source:** `SBD Metrics - Design System.html` (design-system v0.4 handoff bundle)

---

## 1. Foundations

### 1.1 Design intent

Three palettes share one structure: **warm cream (default)**, **cool slate**, and **warm-tinted dark**. Color carries semantic load — it is never decoration. The accent is a punctuation mark, not a paint bucket.

The aesthetic borrows from editorial publishing: large serif display headings, soft pastel pink-to-peach-to-blue gradient backdrop, generous whitespace, translucent surfaces, and a sticky pill-shaped navigation.

### 1.2 Typography

Three families, each with one job:

| Family | Use | CSS token |
| --- | --- | --- |
| **Söhne / Inter Tight** (sans) | All UI: buttons, labels, body, table cells | `--font-sans` |
| **Newsreader / Source Serif 4** (serif) | Editorial display, KPI numerics, section titles | `--font-serif` |
| **JetBrains Mono** (mono, with `tnum`) | IDs, tabular numerics, eyebrows, metadata | `--font-mono` |

**Loaded from Google Fonts:**
`Inter Tight 400/500/600`, `Newsreader 400/500 (italic 400)`, `JetBrains Mono 400/500`.

#### Type scale

| Token | Size | Notes |
| --- | --- | --- |
| `--t-display` | 56px | Reserved for hero — actual hero uses 92px inline. |
| `--t-h1` | 36px | Section titles use 38px inline. |
| `--t-h2` | 24px | |
| `--t-h3` | 18px | |
| `--t-body` | 14px | Default body. |
| `--t-small` | 12px | Card sub, table content. |
| `--t-micro` | 11px | Eyebrows, mono metadata. |

#### Letter spacing

| Token | Value | Use |
| --- | --- | --- |
| `--ls-tight` | -0.02em | Display serif. |
| `--ls-normal` | -0.005em | Buttons, body. |
| `--ls-wide` | 0.08em | — |
| `--ls-eyebrow` | 0.14em | All-caps mono eyebrows. |

#### Type roles

| Role | Family | Size | Weight | Letter-spacing | Notes |
| --- | --- | --- | --- | --- | --- |
| Display | serif | 44px (hero up to 92px) | 400 | -0.02em / -0.035em | line-height 1 / 0.98 |
| Section title | serif | 22–38px | 400 | -0.015em to -0.025em | italic span uses accent color |
| UI title (card) | sans | 14px | 500 | -0.01em | |
| Body | sans | 13px | 400 | — | color `--ink-2` for secondary |
| Data | mono | 13px | 400 | — | `font-feature-settings: "tnum"` |
| Eyebrow | mono | 11px | 500 | 0.14em, uppercase | color `--ink-3` |

Body uses `font-feature-settings: "ss01", "cv11"` and `-webkit-font-smoothing: antialiased` for the editorial look.

### 1.3 Color — Warm (default)

```
--bg            #faf6f0   base cream
--bg-2          #f3ede2
--bg-3          #e9e0d0
--surface       rgba(255, 252, 246, 0.72)   translucent over gradient
--surface-solid #fffcf6
--surface-tint  #f7f1e5
--line          rgba(60, 50, 35, 0.10)
--line-strong   rgba(60, 50, 35, 0.18)

--ink           #1a1813
--ink-2         #2f2c25
--ink-3         #6b6353
--ink-4         #9a917e
--ink-5         #c2baa7

--accent        #a87a3c   muted gold
--accent-soft   #e6cfa3
--accent-bg     #f0e3c7
--accent-2      #c87a4a   secondary terracotta
```

#### Editorial gradient (fixed background, applied to `body`)

```css
--grad:
  radial-gradient(ellipse 90% 60% at 12% 0%,  #fad8d6 0%, transparent 55%),
  radial-gradient(ellipse 70% 50% at 90% 5%,  #fce7c8 0%, transparent 60%),
  radial-gradient(ellipse 80% 60% at 95% 95%, #d8e2f0 0%, transparent 55%),
  linear-gradient(180deg, #faf2e6 0%, #faf6f0 100%);
```

The gradient layers — pink → peach → blue — give the warm theme its signature feel. Use `background-attachment: fixed` so the gradient stays put on scroll.

### 1.4 Color — Cool

```
--bg            #eef2f6
--bg-2          #e4e9ef
--bg-3          #d8dfe7
--surface       rgba(255, 255, 255, 0.78)
--surface-solid #ffffff
--surface-tint  #f5f7fa
--line          rgba(20, 30, 50, 0.10)
--line-strong   rgba(20, 30, 50, 0.18)

--ink           #16191d
--ink-2         #2f343b
--ink-3         #5a626d
--ink-4         #8a929e
--ink-5         #b3bac4

--accent        #3e6790
--accent-soft   #b8cee2
--accent-bg     #d8e5f0
--accent-2      #5a8aa8
```

Cool gradient: light blue washes top-left + top-right + bottom-right over `#eef2f6 → #e9eef3`.

### 1.5 Color — Dark (warm-tinted)

```
--bg            #14110a
--bg-2          #1c1812
--bg-3          #28231a
--surface       rgba(34, 30, 22, 0.72)
--surface-solid #1c1812
--surface-tint  #1e1a13
--line          rgba(240, 225, 195, 0.10)
--line-strong   rgba(240, 225, 195, 0.20)

--ink           #f0e9d8
--ink-2         #d4ccb8
--ink-3         #a39c87
--ink-4         #756e5d
--ink-5         #4f4a3d

--accent        #d4a050
--accent-soft   #6b5028
--accent-bg     #2e2412
--accent-2      #d97648
```

Dark gradient uses translucent warm reds, oranges, and a cool blue accent on a near-black warm base — security-ops feel, kept warm.

### 1.6 Semantic status colors

Status maps directly to assessment-ops vocabulary. Never invent new colors — use one of these five.

| Token | Warm | Cool | Dark | Meaning |
| --- | --- | --- | --- | --- |
| `--ok` / `--ok-bg` | `#4f6b3a` / `#e3e8d4` | `#2f6b56` / `#d4e6dd` | `#7a9a5a` / `#2a3220` | Completed / on track |
| `--warn` / `--warn-bg` | `#b08020` / `#f0e3c0` | `#a06a18` / `#f0e0c0` | `#c89a3a` / `#3a2e15` | Nearing SLA / at risk |
| `--bad` / `--bad-bg` | `#9a3a2a` / `#f0d4c8` | `#8a2f2f` / `#f0d4d4` | `#c45a40` / `#3a2018` | Breached / failed |
| `--info` / `--info-bg` | `#4a6580` / `#d8e0e8` | `#2f5d8a` / `#d8e5f0` | `#6a8aa8` / `#1e2830` | In progress / scheduled |
| `--neutral` / `--neutral-bg` | `#8b8472` / `#ebe4d4` | `#6a727c` / `#e0e4ea` | `#a39c87` / `#2a2618` | Kickoff / unset |

### 1.7 Theme switching

Themes are activated by setting `data-theme="cool"` or `data-theme="dark"` on `<html>`. Warm is the default (no attribute). All tokens cascade — layout, type, and proportions don't change between themes; only the palette swaps.

---

## 2. Geometry

### 2.1 Spacing — 4-base scale

| Token | Value | Common use |
| --- | --- | --- |
| `--s-1` | 4px | Tightest gap. |
| `--s-2` | 8px | Inline gaps, tag spacing. |
| `--s-3` | 12px | Stack inside cards. |
| `--s-4` | 16px | Topbar padding, KPI gaps. |
| `--s-5` | 20px | **Card body padding.** Section grid gap. |
| `--s-6` | 24px | Section gap. |
| `--s-7` | 32px | Topbar/tabs horizontal padding. |
| `--s-8` | 40px | — |
| `--s-9` | 56px | **Page rhythm** between major sections. |
| `--s-10` | 72px | Hero/header bottom margin. |

### 2.2 Radii — tight scale

| Token | Value | Use |
| --- | --- | --- |
| `--r-xs` | 3px | Inline keys, kbd. |
| `--r-sm` | 5px | Buttons (rectangular), nav items. |
| `--r-md` | 8px | Inputs, theme preview cards. |
| `--r-lg` | 12px | Cards, KPI tiles, surfaces (max). |
| Pill | 999px | Buttons, pills, chips, search, progress bars, doc-nav. |

### 2.3 Shadows

```
--shadow-sm: 0 1px 0 rgba(31, 29, 24, 0.04);
--shadow-md: 0 1px 2px rgba(31, 29, 24, 0.05), 0 4px 16px rgba(31, 29, 24, 0.04);
```

Sticky doc-nav uses `0 4px 24px rgba(60, 50, 35, 0.06)`.

### 2.4 Layout

- App grid: `220px 1fr` — sidebar + main.
- Main content max-width: `1180px`, centered, padded `var(--s-9) var(--s-7)`.
- Sidebar is sticky, full viewport height, translucent (`rgba(255, 252, 246, 0.55)`) with `backdrop-filter: blur(12px)`.
- Topbar: flex, padded `var(--s-4) var(--s-7)`, bottom border `--line`.

### 2.5 Surface treatment

Cards and KPI tiles use `background: var(--surface)` (translucent) plus `backdrop-filter: blur(8px)` so the gradient shows through. Sidebar and doc-nav use blur 12px. Solid alternative: `--surface-solid`.

---

## 3. Components

All components live in `components.css`. Markup uses semantic class names — no utility classes.

### 3.1 Doc nav (sticky pill)

Floating pill nav, centered, sticky 16px from top. Translucent background per theme, 999px radius, padded `6px 8px 6px 18px`. Eyebrow label on the left (with right border separator), then nav links. Active link inverts: `background: var(--ink); color: var(--bg)`.

### 3.2 Buttons — `.btn`

| Variant | Class | Background | Text | Border |
| --- | --- | --- | --- | --- |
| Default | `.btn` | `--surface` | `--ink` | `--line` |
| Primary | `.btn .btn-primary` | `--ink` | `--bg` | `--ink` |
| Accent | `.btn .btn-accent` | `--accent` | `#fff` | `--accent` |
| Ghost | `.btn .btn-ghost` | transparent | `--ink-2` | transparent |

- Shape: pill (`border-radius: 999px`), padding `8px 14px`, font `13px / 500 / -0.005em`.
- Small: `.btn-sm` → `12px / padding 5px 9px`.
- Hover: default lifts to `--bg-2` + `--line-strong`; primary darkens to `--ink-2`.
- Transition: `background 80ms ease, border-color 80ms ease`.
- Icon child (`.icon`) is `14px × 14px`.

### 3.3 Cards — `.card`

```
background: var(--surface);
backdrop-filter: blur(8px);
border: 1px solid var(--line);
border-radius: var(--r-lg);   /* 12px */
overflow: hidden;
```

Anatomy:
- `.card-header` — flex row, padded `var(--s-4) var(--s-5)`, border-bottom `--line`.
- `.card-title` — sans, 14px, weight 500, `-0.01em`.
- `.card-sub` — 12px, color `--ink-3`, margin-top 2px.
- `.card-body` — padded `var(--s-5)`. Use `.card-tight` to remove body padding (e.g. tables).

### 3.4 KPI tile — `.kpi`

Same surface treatment as `.card`. Padded `var(--s-5)`, min-height 138px, vertical flex stack with gap `var(--s-3)`.

Anatomy:
1. `.kpi-label` — eyebrow style (mono, 11px, uppercase, `--ink-3`).
2. `.kpi-value` — **serif, 48px, weight 400, `-0.025em`, line-height 1, `tnum`**. Optional `.unit` child for `%`/`d`/etc — sans 14px, `--ink-3`.
3. `.spark` — full-width 36px sparkline.
4. `.kpi-foot` — flex row pushed to bottom (`margin-top: auto`). Contains `.kpi-delta` (mono, 12px, color reflects direction: `.up` → `--ok`, `.down` → `--bad`, `.flat` → `--ink-3`) and a caption.

### 3.5 Status pills — `.pill`

Inline-flex, 11px sans, weight 500, padded `3px 8px`, pill-shaped, 6px dot prefix.

| Class | Use |
| --- | --- |
| `.pill-ok` | On track / completed |
| `.pill-warn` | At risk / in review |
| `.pill-bad` | Breached / blocked |
| `.pill-info` | In progress / scheduled |
| `.pill-neutral` | Kickoff / unspecified |

Each variant uses its `--{status}-bg` background, `--{status}` text, and `color-mix(in oklab, var(--{status}) 20%, transparent)` border. The dot is the solid status color. Neutral uses `--ink-2` text and `--ink-4` dot.

### 3.6 Filter chips — `.chip`

Pill, 12px, padded `5px 12px`, `--surface` background, `--line` border. `.chip-active` inverts to `--ink` background / `--bg` text. Optional `.x` close hint uses `--ink-4`.

### 3.7 Progress — `.progress`

Flex row: bar + numeric label.

- `.progress-bar` — flex 1, height 6px, `--bg-3` background, 999px radius, `overflow: hidden`.
- `.progress-fill` — full height, 999px radius. Default `--ink`. Modifiers: `.ok` `.warn` `.bad` `.accent` map to semantic tokens. **Color is meaningful — accent for active, ok ≥ 90%, warn ≤ 50%, bad on breach.**
- `.progress-num` — mono, 11px, `--ink-2`, min-width 32px, right-aligned, `tnum`.

### 3.8 Tables — `.table`

- `width: 100%`, `border-collapse: collapse`, `font-size: 13px`.
- `thead th` — eyebrow style (mono, 11px, uppercase, 0.14em, weight 500, `--ink-3`), padded `10px var(--s-5)`, faint translucent header background per theme, border-bottom `--line`.
- `tbody td` — padded `12px var(--s-5)`, border-bottom `--line` (last row no border).
- `tbody tr:hover td` — tints to `--bg-2`. **No alternating zebra.**
- `.num` — mono with tabular figures, `--ink-2`. `.muted` — `--ink-3`. Pills used inline for status.

### 3.9 Tabs — `.tabs` / `.tab`

Horizontal tab bar, padded `0 var(--s-7)`, border-bottom `--line`, `var(--bg)` background.

- `.tab` — 13px, `--ink-3`, padded `11px 14px`, 2px transparent bottom border, `margin-bottom: -1px` so the active border overlaps the row border.
- `.tab.active` — text `--ink`, bottom border `--accent`.
- `.tab-count` — mono 11px pill in `--bg-2`. Active state: `--accent` text on `--accent-bg`.

### 3.10 Avatar — `.avatar`

22px circle, `--bg-3` background, `--ink-2` initials in mono 10px / 600. Border `--line`. `.avatar-stack` overlaps stacked avatars by -6px.

### 3.11 Search — `.search`

Pill (999px), padded `7px 14px`, `--surface` background, `--line` border, min-width 260px. 13px, `--ink-3`. Inner `<input>` is borderless / transparent / inherits font. `.kbd` companion: mono 10px in `--bg-2` with `--line` border, 3px radius.

### 3.12 Eyebrow — `.eyebrow`

```
font-family: var(--font-mono);
font-size: 11px;
letter-spacing: 0.14em;
text-transform: uppercase;
color: var(--ink-3);
font-weight: 500;
```

Used everywhere as the small all-caps label above titles, KPI labels, table headers, section markers (`Section 01 ——`).

### 3.13 Section head — `.section-head`

Flex row, end-aligned, with `--s-4` bottom margin. Contains:
- `.eyebrow` — section number marker (`Section 01 —— Foundations` style with em-dash).
- `.section-title` — serif, 38px, weight 400, `-0.025em`, line-height 1.05. `<em>` children render in `--accent` italic.
- `.section-sub` — 13px, `--ink-3`, max-width ~560px.

### 3.14 Donut ring — `.ring`

120×120 `<svg>` rotated -90° so the arc starts at 12 o'clock. Stroke uses `strokeDasharray` (no `linecap: round` — that bug caused the arc to leak past 0). Center labels stack a serif numeric (`.v`, 26px, `-0.02em`, `tnum`) above an eyebrow (`.l`).

### 3.15 Sidebar nav — `.nav-item`

Flex row, padded `7px var(--s-3)`, 5px radius, 13px, `--ink-2`. `:hover` → `--bg-2`. `.active` → inverts to `--ink` / `--bg`. Optional `.nav-count` (mono, 11px, `--ink-4`) on the right; in the active state, count flips to `--bg-3`.

`.nav-label` is an eyebrow-style group header above stacks of items.

### 3.16 Brand — `.brand`

Flex row with 10px gap.
- `.brand-mark` — 22×22, 4px radius, `--ink` background, `--bg` text, mono 11px / 600.
- `.brand-name` — serif 18px, weight 400, `-0.015em`. `<em>` child renders italic in `--accent`.

### 3.17 Crumbs — `.crumbs`

13px row, `--ink-3`, with `.crumbs-sep` (color `--ink-5`) between segments. `<strong>` is the current location: `--ink`, weight 500.

### 3.18 Tag list — `.tag-list`

Flex, 6px gap, wraps. Holder for inline pills.

---

## 4. Charts

One `Chart` component, three variants — **line · area · bar**. Globally tweakable. Plus an inline `Spark` for KPI sparklines (same three variants).

### 4.1 Rules

- Gridlines stay subtle — dashed and pale (`--line` or lighter).
- Numbers stay tabular (`tnum`).
- Use one chart variant per page — never mix.
- Colors come from `--accent` by default; `--bad` for breach-related series.
- SVG `<linearGradient>` IDs must be unique per instance — generate from a counter, never from a CSS variable (parens/dashes aren't valid SVG IDs).

### 4.2 Sparkline (`.spark`)

Block, 100% width, 36px height. Used inside KPI tiles. Reflects the global chart-style tweak.

---

## 5. Tweaks

The applied dashboard ships a Tweaks panel (floating bottom-right). Two controls:

| Tweak | Options | Effect |
| --- | --- | --- |
| **Theme** | `warm` (default) · `cool` · `dark` | Sets `data-theme` on `<html>`. |
| **Chart style** | `line` · `area` · `bar` | Swaps both `Spark` and `Chart` rendering across the document. |

Default is `{ theme: "warm", chartStyle: "bar" }`.

---

## 6. Principles

The six rules that guide every decision in the system:

1. **Color carries meaning.** Status pills map to assessment-ops vocabulary — on track, at risk, breached. The accent is a punctuation mark, not a paint bucket.
2. **Numbers are typography.** Serif numerics for KPIs; mono with tabular figures for everything that aligns in a column. Nothing else gets to be expressive.
3. **Density is balanced.** KPI strip up top, working tables below. Both the analyst running the day and the stakeholder skimming a screenshot land safely.
4. **Charts are quiet.** Line, area, or bar — never all three on one page. Gridlines are dashed and pale. The shape does the talking.
5. **Warm by default.** Cream surfaces are the resting state because reports get read for hours. Dark is opt-in and stays warm.
6. **Empty space earns its keep.** We refuse to fill cards with filler. If a section has nothing to say today, it stays out of the layout.

---

## 7. Asset checklist for implementation

- `tokens.css` — CSS custom properties for all three themes, base body styles, type utilities (`.eyebrow`, `.serif`, `.mono`, `.tnum`).
- `components.css` — every component class above.
- Google Fonts: Inter Tight (400/500/600), Newsreader (400/500 + italic 400), JetBrains Mono (400/500).
- React-based components in the prototype: `DesignSystem`, `Dashboard`, `TweaksPanel`, `TweakSection`, `TweakRadio`, `Chart`, `Spark`, `Ring`, plus `useTweaks` hook for theme/chart-style state. Reimplement these in whatever framework the target codebase uses — match the visual output, not the prototype's internal structure.
