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

Commit **every** change, as soon as it works — don't wait to be asked and don't wait for the user to accept it. A request that covers two separable things is two commits, each made as it lands. Commit on the `main` branch with a concise message describing what changed and why. Stage only relevant source files — not `dist/`. After committing, always state in the response that a commit was made and include the commit message.

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
- **Mood labels are unvalidated** — `bleak / rough / low / okay / good / great /
  bright`. They're one array in `utils/mood.ts` and the scale length derives from
  it. Seven is the ceiling the palette supports; changing the *length* again
  means the array, the `--mood-N` pairs in `index.css`, **and** a branch in
  `migrateMoodScale` (storage.ts) plus an `EXPORT_VERSION` bump — stored days are
  indexes into this array, so they mean nothing without it.

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
| `--accent`      | `#b8701a`               | `#e0a052`               | `#tags` on a day with no mood |
| `--accent-tint` | `rgba(accent, 0.10/.12)`| —                       | Tag chip backgrounds |
| `--delete`      | `#b0453c`               | `#cf6157`               | Destructive actions |

**The mood ramp is the only saturated colour in the app.** Everything else is
warm greyscale. Tags borrow `--accent`, which is the warm end of the same ramp,
so the whole palette stays one temperature family.

### Mood ramp

`--mood-0` … `--mood-6`, indexed to `MOOD_LEVELS` in `utils/mood.ts`.

| Step | Label   | Light     | Dark      |
|------|---------|-----------|-----------|
| 0    | bleak   | `#5a7ea3` | `#32557b` |
| 1    | rough   | `#7f99b3` | `#4f6881` |
| 2    | low     | `#9fb0c0` | `#687886` |
| 3    | okay    | `#c5bcb1` | `#867f76` |
| 4    | good    | `#cbb194` | `#9e876d` |
| 5    | great   | `#d69c65` | `#c6905d` |
| 6    | bright  | `#e27e19` | `#f89845` |

Cool slate → warm neutral → amber. **Never red↔green**: it reimports the
pass/fail framing the app is built to avoid, and it's the worst possible choice
for colour-blind readers. Temperature reads as weather, not as a grade.

**These are derived, not chosen.** Three OKLCH anchors — a near-grey centre, a
warm end, a cool end — and every step between them interpolated through
`e(d) = (d/3)^1.35`, where `d` is the distance from centre. The exponent eases
each arm *out* of the neutral, so `low` and `good` sit close to `okay` and the
outer steps carry the range: a nudge off neutral should look like a nudge. It is
the one number to touch if the middle feels too quiet or too loud. Hue rotates
as an arm intensifies (76° tan → 58° orange, 242° → 250° slate) — that torsion
is what stops the ramp reading as a tint slider. The arms are balanced by eye
against each other's *weight*, not by matching chroma: blue needs less chroma
than amber to read as itself.

The two themes are structurally different, and should stay that way:

- **Light is a hill** — the neutral is the lightest step, nearest the paper, and
  both arms darken outward. The flat day is the one that disappears.
- **Dark is a climb** — lightness rises the whole way (0.440 → 0.765), because on
  this background a dark blue reads as *dim* rather than as cool.

Use `moodColor(i)` for a step and `moodColorMix(f)` for a fractional value (an
average, or a thumb mid-drag) — the latter blends neighbouring steps via
`color-mix`.

### Tags take the day's colour

A `#tag` in the note is painted with the mood of the day it was written on, not
with a fixed highlight: the day has one temperature and everything written that
day belongs to it. `App.tsx` publishes `--day-mood` and a `data-mood` attribute
on `.app`, and `.app[data-mood]` turns that into the **two tokens everything
else reads**: `--day-ink` (relative colour syntax — the mood's **hue** kept,
lightness and chroma clamped into the band text can live in via
`--ink-l-min/max` and `--ink-c-min/max`, per theme) and `--day-tint` (the same
colour at 14%, for anything that needs a wash behind the ink). The chroma
*floor* matters — without it a flat day's tags would be indistinguishable from
prose.

Two things wear it: `.tag` and the autocomplete chips. Anything else that lives
inside a single day should read `--day-ink`/`--day-tint` rather than re-deriving
the expression. Note the dock is **not** one of them — it is app chrome standing
on the rail axis, not something written on the day, so its buttons stay muted.

No mood set → no `data-mood` → plain `--accent`, as before. The whole rule is
inside `@supports (color: oklch(from red l c h))`, so anything without relative
colour keeps the accent. Tags in the **tag sheet** stay `--accent`: that list
spans days, and colouring it by any one day's mood would be a lie.

### The right-hand axis

`--rail-cx` = `--pad + --track-rest-w/2`: the mood rail's centre line, measured
from the right edge of the screen. The heatmap grid ends on `--pad`, the rail's
track sits just inside that same edge, and the dock (back-to-today, tags,
settings) is centred on the line beneath it. **Anything else pinned to the right derives
its position from `--rail-cx`** — the page gets one vertical axis, not three, and
it stays aligned if `--pad` ever changes. Nothing here is nudged by eye.

The layout that carries it: `.content` is two columns, `.content-main` (date +
note) and a `.mood-column` spacer exactly as wide as the visible track, with a
`--pad` gap between them — so the note is inset from the rail by the same amount
it's inset from the left edge of the screen. **That equality is the point; don't
widen the spacer to make room for the rail's touch target.**

Four tokens place the rail and everything that follows it:

- `--content-top` — where the graph ends. The one number CSS can't derive; set
  in App.tsx from the same measurement the sheet height uses.
- `--vh-stable` — the keyboard-free viewport height, also set in App.tsx: the
  tallest height seen at the current viewport width. See below.
- `--rail-y` = `--content-top + --rail-top` — where the rail starts.
- `--rail-h` — half the distance from there to where a full-length rail would
  meet a bottom-anchored dock, times `--rail-scale` (0.75). Change the scale,
  not the formula.

The rail is `position: fixed` (frame, not page: it neither scrolls away from a
long note nor slides up and leaves a hole above the dock), and the dock is placed
off the rail's foot rather than the screen's, so **changing `--rail-h` moves the
buttons with it.** Nothing here is positioned by eye or restated.

**Nothing on this axis may size off `100dvh`.** The viewport meta is
`interactive-widget=resizes-content`, so an Android software keyboard shortens
the layout viewport — and a rail measured against `dvh` shrinks, taking the dock
up with it, every time you start typing. `--vh-stable` only ever grows at a given
width, so the keyboard can't move the rail; a rotation changes the width and
resets the measurement.

The rail's box is 44px against a 10px track: the visual stays a hairline, the
target is a thumb. Keep that split — a thin control does not have to be a thin
target — but keep the box clear of the note's last character, or it steals taps
meant for the caret.

### The thumb's glow

`.mood-glow` (in `MoodSlider.tsx`) is a wash of the thumb's colour bleeding in
from the right edge, centred on the thumb — the page lit by the day's weather.
It shares the thumb's states and rates (spring at rest, no easing under the
finger, the blended colour mid-drag, out first when the clear gesture arms) and
is positioned in the rail's own terms (`--rail-top + --rail-h × --glow-at`), so
it lands on the thumb without measuring. It paints at `z-index: -1` inside
`.app`'s own stacking context (`isolation: isolate` — without that, body's
background covers it), under the note and over the page colour.

Four gradient rules keep it a glow and not a smear, and any new gradient in the
app should follow them: **eased stops** (`(1 − t)²`, eleven of them — a
two-stop gradient has a visible edge), **fade to the colour's own transparent**
via `color-mix(... transparent)` (plain `transparent` is transparent *black* and
muddies the tail), **mix in OKLCH** so half-alpha stops keep their hue, and
**grain** — a tiled SVG noise mask dithering alpha over 0.7–1.0, because a
ramp this shallow spans more pixels than 8 bits have steps and otherwise rings.
The clip fades the top edge over `--glow-fade` rather than cutting it, so no
light shows through the heatmap's empty cells. `--glow-peak` is the one knob
(0.34 light, 0.48 dark — the cool half of the ramp is dark on dark and needs
laying on thicker).

### Motion

`--spring` (`cubic-bezier(0.34, 1.56, 0.64, 1)`) overshoots ~10% and settles.
Use it for anything **landing on a position**; use plain `ease` for opacity and
colour, which have nothing to overshoot.

The mood slider is the reference for how interaction should feel, and it splits
one gesture into two rates:

- the **value** quantises the instant you cross a band — label swap plus a
  `detent()` (`utils/feedback.ts`). It is the app's **only** feedback event and
  should stay that way: a device that reacts to everything gets switched off.
  Settings picks how it lands — `vibrate | click | off` — and that is a *choice*,
  not a capability check, deliberately. `navigator.vibrate` exists in desktop
  Chrome and Firefox and silently does nothing, and no web API can drive a Mac's
  trackpad haptics at all, so nothing can be reliably detected here; the person
  holding the device is the only one who knows what it is. The pulse is 20 ms —
  under ~15 ms many Android phones deliver nothing you can feel — and the click
  is a 18 ms WebAudio tick built on the first detent, inside the gesture;
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

### Panels

```css
top: var(--content-top);   /* under the graph, down to the bottom of the screen */
transform: translateX(100%) → translateX(0);
z-index: 20;                     /* scrim 19; rail and dock 30, both on top */
```
A panel turns the page **like a book: in from the right**, off the side the
button that opened it lives on — not up from the bottom, which pointed away from
the controls. It is full-bleed but slides **under** the right-hand axis: the rail
and the dock are the top layer (`z-index: 30`) and nothing covers them. So the
button that opened a panel is still lit and still there to close it, and a panel
needs no close button of its own — `SheetClose` existed for that and is gone.
Panel content is inset on the right by `--rail-gutter` (`--rail-cx` plus half a
dock button, i.e. where the controls reach), so no row runs under the buttons.
`.rail-veil` fills that gutter with a left-fading wash of `--bg` at `z-index: 25`
— between the panel and the controls — so a panel appears to come *out from
under* the rail rather than to travel behind it. It is `--bg` on `--bg` over a
strip nothing else paints in, so it changes nothing when the app is at rest.
Panels are mutually exclusive.

**Panels are not resizable and have no stored height.** They fill from
`--content-top` (the foot of the graph, so the grid always stays visible) to the
bottom of the screen. There was a drag handle and a persisted height; both are
gone — one size, nothing to tune. The scrim is a transparent tap-catcher over
the graph — it must never dim the heatmap.

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
  Also holds `migrateMoodScale`, run once from `main.tsx` before anything reads a
  day — it is gated on the stored scale length, because a migration that shifts
  indexes is only safe if it cannot run twice.
- `utils/parser.ts` — the core, and deliberately tiny. Extracts `#tags` from a
  line and nothing else. `activeTagFragment` drives autocomplete.
- `utils/tags.ts` — `buildTagCatalog` aggregates across days. Tags are counted
  **per day, not per occurrence**.
- `utils/mood.ts` — the scale, labels and colour helpers.
- `utils/feedback.ts` — the detent, as a buzz or as a click.
- `utils/lock.ts` — the app lock. WebAuthn against a *platform* authenticator
  is the only web API that can put up the OS's own unlock sheet (fingerprint,
  face, PIN — Touch ID and Windows Hello too). There is no server, so the
  signature is never checked: the guarantee is that the browser refuses to
  resolve `credentials.get()` until the OS has verified the person. **A door,
  not a safe** — the notes stay in plain `localStorage` underneath, and the
  settings copy says so. `enrollLock` registers once and keeps the credential
  id under `lock_credential` (never exported; it's bound to this device and
  origin); `verifyLock` asks for that exact id and returns false for *every*
  failure, since from the lock screen they all mean "still locked".
- `utils/theme.ts`, `utils/settings.ts`, `utils/data.ts` (export/import/stats),
  `utils/window.ts` (21-week heatmap geometry), `utils/format.ts`, `utils/tap.ts`.

**Components:**
- `App.tsx` — all state: viewed day, text, mood, cursor, sheets, theme. Swipe
  navigation, debounced auto-save (400 ms), tag suggestion computation.
- `components/MoodSlider.tsx` — the day's mood. A discrete vertical rail down
  the right edge, warm end at the top; label on drag only. A step rests at the
  **middle of its band**, not at the end of the track, and a touch anywhere in a
  band selects it. Clearing is a gesture, not a button: drag the thumb past
  either end of the track — beyond `CLEAR_DISTANCE` (56px), past the pointer's
  own capture, since `setPointerCapture` keeps delivering `clientY` outside the
  element's box — and the track fades and the label swaps to "clear"; let go
  there and the mood is cleared, release before that and nothing happens. The
  crossing gets the same single `detent()` a band edge gets, not a second kind
  of feedback event. Backspace/Delete on the focused rail clears it too, for
  keyboard use.
- `App.tsx`'s dock — back-to-today and the two sheet toggles — is a **fixed
  column of three**. Back-to-today holds its space (`.dock-optional`, opacity
  only) when you're already on today, so tags/settings never shift under a
  thumb; it also tints to today's mood colour when one is set. `--dock-h`
  derives from the button count, and it feeds `--rail-h`, so adding a button
  shortens the rail rather than colliding with it.
- `components/Editor.tsx` — textarea + overlay for tag highlighting and ghost text.
- `components/Heatmap.tsx` — 21-week grid, cell colour = mood.
- `components/TagSheet.tsx` — tag catalog, frequency and the tag × mood readout.
  Each tag is **one row**: mood dot, name in that colour, day count, average
  score. There is no description box — a stat that needs a sentence belongs in
  the expansion. Expanding a row lists the days *and* filters the heatmap (see
  below); collapsing or closing the sheet clears the filter.
- `components/SettingsSheet.tsx` — theme, lock, data stats, export/import/clear.
  The lock's state lives here, not in App — the gate reads storage directly, so
  nothing above the sheet needs to know. Turning it on only flips the control
  once the OS ceremony has actually succeeded; turning it off needs no ceremony
  (whoever is here already got past it). The section is replaced by a one-line
  reason when the lock can't be offered (not https, no screen lock, no API).
- `components/LockGate.tsx` — wraps `<App>` in `main.tsx`. While locked the app
  stays **mounted** but `inert` and `visibility: hidden`, under an opaque lock
  screen at `z-index: 40` (above the rail and dock) — so a quick trip away and
  back lands on the same day, scroll and caret. Locking is decided when the
  page becomes *visible* again (only the return knows how long it was away),
  against the grace period in settings (`now | 1m | 5m`, default a minute), and
  flushed with `flushSync` so the note is never painted for a frame before the
  lock is. Whether the lock is on and the grace are read from storage at that
  moment, never cached. The lock screen prompts on mount (a silent failure
  there just leaves the glyph to tap — some browsers want a gesture first) and
  offers one way out for someone whose credential the OS has lost: **reset**,
  which wipes every day, drops the lock and reloads. That is the whole escape
  hatch — anything softer would be a bypass.

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
- `Heatmap` takes an optional `filterDates`. Non-null means **only these days
  exist**: every other cell renders as an untouched day, so expanding a tag turns
  the graph into a picture of that tag. Applied at render time next to `liveDay`,
  for the same reason — filtering must not re-read and re-parse every stored day.
  The 0.18s background transition on `.heatmap-cell` makes it read as a lens
  rather than a redraw; that transition is load-bearing, don't remove it.
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

`manifest.json`'s `theme_color`/`background_color` are **`#14120f` (dark)**, not
`--bg`'s light value. On Android, a standalone-launched PWA's status bar takes
this straight from the manifest and does not track the live `theme-color` meta
tag `applyTheme` (`utils/theme.ts`) keeps in sync for the browser-tab case — the
manifest spec has no light/dark variant for it (`media_overrides` is still a
proposal, unshipped). One static value is picked here on the bet that a daily
journal gets opened disproportionately at the evening/night ends of the day,
inside the app's own dark window (19:00–06:00) — so it's still wrong during
the day, just wrong less often. If that bet stops paying off, the fix is this
one pair of values, not the meta-tag logic, which is already correct.

`public/favicon.svg` and `public/icon-maskable.svg` are the sources; the PNGs are
rendered from them. They are placeholders — the mood ramp as a 3×3 grid.
