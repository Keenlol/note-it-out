# note-it-out

Note down what you did, what you felt, and what you wish you'd done. One mood a
day, in colour.

A sibling to [note-it-down](https://github.com/Keenlol/note-it-down) — same
skeleton, different nervous system.

---

## How it works

**Write whatever you want.** There's no form, no category picker, no good/bad
buttons. Just a page per day.

```
went to the gym before work, didn't want to but did #gym
called mum, hadn't in three weeks #family
still haven't booked the dentist #avoidance
```

**Put a `#tag` anywhere in a line** — mid-sentence is the point. The note and the
count are the same keystroke, so you never have to write a thing twice to have it
counted. Typing `#` lists what you've used before; a unique prefix completes
inline, and Tab or Enter accepts it.

Tags count **days, not mentions**. Crying twice on a Tuesday is still one day.

**Set the day's mood on the slider.** Five steps, bad to good. The word only
appears while your thumb is down — after that the colour is the readout. You can
set it for any past day, and you can clear it again.

That's the whole app.

## The colour

The heatmap is a year of temperature: cool slate for rough days, warm neutral in
the middle, amber for good ones. Not red and green — this isn't a scoreboard, and
a green/red grid makes every bad day look like a failed one.

A day you never opened is an empty outline. A day with a note but no mood gets a
faint fill. Blank is blank, never the bottom of the scale.

## The bit that's actually useful

Because the mood and the tags live on the same day, the Tags sheet can tell you
things the note alone can't:

> **#gym** — averages *good* (3.3/4) over 6 rated days, **+1.33** vs. days without it
>
> **#avoidance** — averages *low* (1.0/4) over 5 rated days, **−1.76** vs. days without it

Read it as a nudge, not a finding. It needs at least five rated days on each side
before it'll show a comparison at all, and the causation often runs backwards —
you tag a bad day, the tag doesn't cause it.

## Your data

Everything lives in your browser's `localStorage`. Nothing is uploaded anywhere,
there's no account, and there's no server to leak it.

The flip side: clearing site data wipes it, and it doesn't follow you to another
device. Settings has **Backup** (JSON, re-importable) and **Markdown** (a readable
report). Use them now and then.

## Install it

It's a PWA — open it on your phone and add it to your home screen. It works
offline after the first load.

## Running it

```bash
npm install
npm run dev      # dev server
npm run build    # → dist/
npm run preview  # preview the production build
```

React 19 + TypeScript + Vite. No backend, no dependencies beyond React and
`lucide-react`.
