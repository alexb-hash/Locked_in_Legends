# Deep Work — a focus timer app

You skipped the details, so here is an opinionated starting point: a self-contained focus
timer with session history. No accounts, no backend — it works the moment it loads, and we
can grow it in any direction from here.

## What you get

**Home (`/`)** — the timer itself:
- Large ring countdown with three modes: Focus 25m, Short break 5m, Long break 15m
- Start / pause / reset, plus automatic cycling (focus → break → focus, long break every 4th)
- Optional task label for the current session ("Write the report")
- Today's totals: sessions completed and focused minutes

**Sessions (`/sessions`)** — history:
- List of completed sessions with label, duration, and time of day
- Simple weekly bar summary of focused minutes
- Clear-history action

**About (`/about`)** — short page explaining the method and how the app works.

Sessions persist in the browser (localStorage), so a refresh keeps your history.

## Design direction

Calm, dark, instrument-like — closer to studio hardware than a wellness app. Deep charcoal
surface, one warm amber accent for the active state, generous whitespace, tight monospaced
numerals for the clock, no gradients or drop shadows. Everything expressed as semantic
design tokens so light/dark stay consistent.

## Technical notes

- Three routes: `src/routes/index.tsx` (replaces the placeholder), `src/routes/sessions.tsx`,
  `src/routes/about.tsx`; shared header/footer in `src/routes/__root.tsx`.
- Timer logic in a `useFocusTimer` hook driven by timestamp math (not tick counting) so
  backgrounded tabs stay accurate; state kept in React, persisted via a small
  `localStorage` helper read inside `useEffect` to avoid hydration mismatch.
- Palette and typography defined as tokens in `src/styles.css`; web font loaded via a
  `<link>` in the root route head.
- Per-route `head()` metadata with unique titles and descriptions.
- No database or auth needed for this scope; if you later want cross-device history or
  streaks tied to a login, that's a follow-up that adds Lovable Cloud.
