# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Vite, hot reload)
npm run build    # tsc + vite build → dist/
npm run preview  # preview the production build locally
```

No test suite — verify features manually in the browser.

## Git workflow

After successfully implementing a feature (when the user accepts it without asking for changes or adjustments), automatically create a git commit on the `main` branch with a concise commit message describing what was added. Stage only relevant source files — not `dist/`. After committing, always state in the response that a commit was made and include the commit message.

**Never push** unless the user explicitly asks. The user handles all `git push` operations.

## What this app is

A freeform daily note plus one self-reported mood. Sibling to `note-it-down` (a
workout tracker) — same skeleton, same interaction patterns, deliberately
different visual language and a completely different parser.

Two ideas carry the whole design, and new features should not undermine either:

1. **Mood is input, not a derived score.** It comes from a slider you set, never
   from counting good/bad entries. There is nothing to game and nothing to
   optimise. A blank day is neutral, not a failure.
2. **The note is freeform.** The app imposes no structure on what you type. The
   only thing the parser reads out of a line is `#tags`.

Avoid anything that turns the log into a scoreboard: no streaks on "good" days,
no completion percentages, no grading. Streaks and trends belong to tags, not to
the mood axis.

## Current state

v1, built in one pass. Everything described below is implemented and working.
Known-incomplete, in priority order:

- **Icons are placeholders** (`public/favicon.svg`, `public/icon-maskable.svg` →
  the PNGs are rendered from them). Real art is pending.
- **No deployment yet.** `vercel.json` is ready; the project just needs importing
  at vercel.com/new. Note that note-it-down lives on a *different* Vercel account
  from the one Claude Code's MCP integration can reach — ask before creating one.
- **Mood labels are unvalidated** — `rough / low / okay / good / great`. They're
  one array in `utils/mood.ts` and the scale length derives from it, so moving to
  7 steps means the array plus two more `--mood-N` pairs in `index.css`.

**Deliberately deferred, do not add without being asked:**

- **A second mood axis.** This was considered at length and cut for v1. If it
  comes back, the ranked shortlist is: tense↔calm (Thayer's tense arousal,
  actionable and genuinely orthogonal to valence), then drained↔wired (Russell
  circumplex, best-validated), then passive↔agentic (PAD dominance — best
  thematic fit but correlates with valence, wasting the dimension). If added, the
  encoding is hue = valence, vividness = the second axis, with the second axis
  capped at ~3 steps since saturation resolution is worse than hue resolution at
  cell size.
- **Per-occurrence tag counting** (`#tag x2`). Day granularity is the decision.

## Design system

All new UI must follow these tokens and patterns. Do not introduce new values — extend from these.

### Colours

Use CSS variables exclusively — never hardcode these values in new rules. Every
token is defined on bare `:root` (light) and overridden under
`:root[data-theme='dark']`. **Never define a colour only inside the dark block.**

| Variable        | Light                   | Dark                    | Usage |
|-----------------|-------------------------|-------------------------|-------|
| `--bg`          | `#faf7f2`               | `#14120f`               | Page background |
| `--surface-1`   | `#f1ebe1`               | `#211e19`               | Outer cards, chips, search, seg control |
| `--surface-2`   | `#e9e1d4`               | `#1a1713`               | Inner card boxes (recessed) |
| `--surface-3`   | `#fffdf9`               | `#2b261f`               | Elevated surfaces (dropdowns) |
| `--line`        | `#e0d7c8`               | `#322c23`               | Hairlines, dividers, sheet border |
| `--cell-line`   | `#f0e9dd`               | `#241f18`               | Empty heatmap cell outline (fainter than `--line`) |
| `--cell-noted`  | `#ece3d4`               | `#2a251d`               | Heatmap cell: note written, no mood set |
| `--text`        | `#2c2620`               | `#ece5da`               | Primary text |
| `--text-2`      | `rgba(…, 0.55 / 0.50)`  | —                       | Secondary / supporting |
| `--text-dim`    | `rgba(…, 0.42 / 0.38)`  | —                       | Metadata, labels |
| `--text-muted`  | `rgba(…, 0.28 / 0.25)`  | —                       | Very subtle text, idle icons |
| `--accent`      | `#b8701a`               | `#e0a052`               | `#tags` only |
| `--accent-tint` | `rgba(accent, 0.10/.12)`| —                       | Tag chip backgrounds |
| `--delete`      | `#b0453c`               | `#cf6157`               | Destructive actions |

**The mood ramp is the only saturated colour in the app.** Everything else is
warm greyscale. Tags borrow `--accent`, which is the warm end of the same ramp,
so the whole palette stays one temperature family.

### Mood ramp

`--mood-0` … `--mood-4`, indexed to `MOOD_LEVELS` in `utils/mood.ts`.

| Step | Label   | Light     | Dark      |
|------|---------|-----------|-----------|
| 0    | rough   | `#6d8aa4` | `#4d6b85` |
| 1    | low     | `#9db1bf` | `#6d8497` |
| 2    | okay    | `#cdc3b3` | `#7d7365` |
| 3    | good    | `#e6ab5c` | `#c98f38` |
| 4    | great   | `#ec9418` | `#e8a02a` |

Cool slate → warm neutral → amber. **Never red↔green**: it reimports the
pass/fail framing the app is built to avoid, and it's the worst possible choice
for colour-blind readers. Temperature reads as weather, not as a grade.

Use `moodColor(i)` for a step and `moodColorMix(f)` for a fractional value (an
average, or a thumb mid-drag) — the latter blends neighbouring steps via
`color-mix`.

### The right-hand axis

`--rail-cx` = `--pad + --track-rest-w/2`: the mood rail's centre line, measured
from the right edge of the screen. The heatmap grid ends on `--pad`, the rail's
track sits just inside that same edge, and the settings gear is centred on the
line. **Anything else pinned to the right derives its position from
`--rail-cx`** — the page gets one vertical axis, not three, and it stays aligned
if `--pad` ever changes. Nothing here is nudged by eye.

The rail's hit area deliberately bleeds `--pad` past the content edge so it runs
to the edge of the screen: the visual stays a hairline, the target is 68px wide.
Keep that split — a thin control does not have to be a thin target.

### Motion

`--spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) overshoots ~10% and settles.
Use it for anything **landing on a position**; use plain `ease` for opacity and
colour, which have nothing to overshoot.

The mood slider is the reference for how interaction should feel, and it splits
one gesture into two rates:

- the **value** quantises the instant you cross a band — label swap plus a
  `navigator.vibrate(8)` detent;
- the **thumb** tracks the finger 1:1 with `transition: none`, and only springs
  onto the grid when you let go.

Snapping pixels mid-drag breaks the illusion of holding an object; that is why
`.mood-slider.dragging` kills the position transition and nothing else does the
positioning. Controls also **swell while held** (track 10→15px, thumb 22→27px)
and settle back on release.

Under `prefers-reduced-motion`, position and size stop animating; fades stay.

### Typography

```
--font:        system sans      (all UI chrome)
--editor-font: Iowan Old Style / Palatino / Charter / Georgia, serif
--editor-size: 1.125rem
--editor-lh:   1.7
```

Entry text is set in a **reading face, not a UI face** — this is a journal, used
sitting down. That serif is the single biggest thing separating this app from
note-it-down visually; don't swap it for the system sans.

The overlay and textarea must stay pixel-identical. Both use
`font-size: max(16px, var(--editor-size))` — the `max()` prevents iOS zoom-on-
focus *and* keeps the two in sync if the root font size changes. Change both or
neither.

### Card / list row pattern

Every list row uses a two-level nested box:

| Layer        | `background`      | `border-radius` | notes |
|--------------|-------------------|-----------------|-------|
| Outer card   | `var(--surface-1)`| `8px`           | `padding: 0 5px`, `margin-bottom: 5px`, `overflow: hidden` |
| Inner box    | `var(--surface-2)`| `3px`           | = outer(8) − padding(5); `margin-bottom: 5px` |

- `overflow: hidden` on the outer card is mandatory — it stops the inner box's
  `margin-bottom` collapsing through, and clips the inner corners cleanly.
- Inner radius formula: **outer_radius − side_padding**. Always derive it.

### Theme

`ThemePref` is `light | dark | auto`. `auto` follows the **clock**, not the OS
scheme (dark 19:00–06:00) — the point is that the app knows what time it is.
`applyTheme` stamps `data-theme` on `<html>` and replaces every
`<meta name="theme-color">` with a single unconditional one; `index.html` ships
two media-scoped ones for the pre-JS first paint.

### Bottom sheet

```css
border-radius: 16px 16px 0 0;
z-index: 20;                                   /* scrim 19, bottom bar 30 */
```
Sheets slide up from the bottom and are mutually exclusive. Default height is
measured from `heatmapRef.bottom` to `visualViewport.height`, so an open sheet
never covers the grid; dragging the handle opts out of auto-sizing for good, and
a tap on the handle closes. The scrim is a transparent tap-catcher — it must
never dim the heatmap.

### Settings patterns

Section layout, `SegmentedControl`, `data-stat-card`, `data-btn` variants and the
inline-confirmation flow are all carried over from note-it-down unchanged. In
particular: **never use `window.confirm()`** — confirmation replaces the action
buttons inline via a `ConfirmState` union, and always offers a Cancel.

## Architecture

Single-page React 19 + TypeScript app, no backend. All data lives in `localStorage`.

**Data flow:**
- `utils/storage.ts` — one record per day under `day_YYYY-MM-DD`, holding both
  `rawText` and `mood` together. A day with neither is deleted, not stored empty.
  `saveDayText` / `saveDayMood` both read-modify-write so neither clobbers the other.
- `utils/parser.ts` — the core, and deliberately tiny. Extracts `#tags` from a
  line and nothing else. `activeTagFragment` drives autocomplete.
- `utils/tags.ts` — `buildTagCatalog` aggregates across days. Tags are counted
  **per day, not per occurrence**.
- `utils/mood.ts` — the scale, labels and colour helpers.
- `utils/theme.ts`, `utils/settings.ts`, `utils/data.ts` (export/import/stats),
  `utils/window.ts` (21-week heatmap geometry), `utils/format.ts`, `utils/tap.ts`.

**Components:**
- `App.tsx` — all state: viewed day, text, mood, cursor, sheets, theme. Swipe
  navigation, debounced auto-save (400 ms), tag suggestion computation.
- `components/MoodSlider.tsx` — the day's mood. A discrete vertical rail down
  the right edge, warm end at the top; label on drag only. A step rests at the
  **middle of its band**, not at the end of the track, and a touch anywhere in a
  band selects it. Sticky, so a long note can scroll without putting the rail
  out of thumb reach — which is why `.content` uses `overflow-x: clip` and not
  `hidden` (`hidden` would make it a scroll container and neuter the sticky).
- `components/Editor.tsx` — textarea + overlay for tag highlighting and ghost text.
- `components/Heatmap.tsx` — 21-week grid, cell colour = mood.
- `components/TagSheet.tsx` — tag catalog, frequency and the tag × mood readout.
- `components/SettingsSheet.tsx` — theme, data stats, export/import/clear.

**Key patterns:**

- `viewDate === null` means "today"; non-null means browsing a past day. One
  `text` state serves both. A pending debounced save is always tagged with the
  day it belongs to (`pending.current = { date, text }`) and flushed on day
  change, `pagehide` and `visibilitychange` — so switching days or backgrounding
  the app can never write one day's text onto another.
- **Mood counts per day; tags count per day too.** Both are day-granular. Resist
  adding per-occurrence counting (`#tag x2`) — it buys little and costs a whole
  category of dedup ambiguity.
- The heatmap has **three cell states** and they must stay distinguishable:
  mood set (temperature colour), note but no mood (`--cell-noted`), nothing
  (outline only). Empty must read as *absence*, never as the low end of the scale.
- `Heatmap` takes a `liveDay` prop applied over the memoized grid **at render
  time, not inside the memo**, so dragging the slider repaints its cell without
  re-reading and re-parsing every stored day on each step.
- Tag autocomplete mirrors note-it-down's preset ghost: bare `#` or an ambiguous
  prefix → list chips as a hint and stay out of the way (Enter still inserts a
  newline); a unique prefix → inline ghost that Tab/Enter accepts.
- Selection rings on heatmap cells use `outline` + `outline-offset`, never an
  inset `box-shadow` — at cell size an inset ring eats the mood colour.

## PWA

Hand-rolled, no plugin. `swPlugin` in `vite.config.ts` generates `dist/sw.js`
after the bundle is written, with a precache list built from the real
content-hashed filenames. Network-first for navigation (falling back to a cached
`index.html` offline), cache-first for hashed assets. Registration in `main.tsx`
is guarded by `import.meta.env.PROD` — in dev the request falls through to
`index.html` and would throw on MIME type.

Note `apple-mobile-web-app-status-bar-style` is `default`, **not**
`black-translucent` as in note-it-down: translucent draws white status-bar text,
which is invisible on warm paper. The cost is no edge-to-edge under the status bar.

`public/favicon.svg` and `public/icon-maskable.svg` are the sources; the PNGs are
rendered from them. They are placeholders — the mood ramp as a 3×3 grid.
