# Redesign the Studly landing page

Make the landing page feel like the "Netflix of studying" instead of a generic feature list. Keep the hero blur title + rotating subtitle. Everything below the hero gets rebuilt into cinematic, product-driven sections using the existing design system (glass-card, glow-ring, Ambience, Reveal/RevealGroup, Floaty, trophy assets, Ken Burns motion).

All work stays in `src/routes/index.tsx` (plus one small data file for shelf content). No backend, no new routes, no auth changes.

## Sections (top to bottom)

### 1. Hero (refined, not rebuilt)
- Keep: static bold "Make studying hit different." + thinner rotating subtitle + the two CTA buttons.
- Replace the static "Episode 3" card with a **live auto-playing mini-preview**: a 16:9 cinema stage that auto-plays a single sample slide — Ken Burns slow push on the background, staggered bullet reveal, a faux scrub bar + play glyph to read as a real player. Loops. Pauses on hover to show controls.
- This is the wow factor: visitors see the actual product playing in the hero.

### 2. Netflix-style cover shelves ("Studly Originals")
- Horizontal scrollable row(s) of series covers with the AI cover-art look (gradient + title treatment, since landing is unauthenticated and can't read private covers). Each card: cover, title, "S1 · N episodes", hover lift + glow.
- Shelf label like "Studly Originals" / "Trending this season".
- Left/right scroll affordance (drift on hover, snap on cards).
- Tapping a card is a no-op anchor (landing is marketing) but visually invites "press play".

### 3. "How it works" — 3-step cinematic flow
Three alternating rows (zigzag), one per real create-wizard step, each with a small mock visual:
  1. **Drop a topic** — mock input chip + material icons (PDF, YouTube, paste).
  2. **Cast your characters** — mock character tiles with avatars + roles.
  3. **Press play** — mock episode card with a play glyph + "Episode 1".
- Each step uses Reveal blur-in and a number badge. Reuses glass-card.

### 4. Susu spotlight
- A glass chat card showing a real Susu exchange: a student question + Susu's Socratic hint (no cheating) rendered with the existing `Markdown` component so bold/lists/code display correctly.
- Side caption: "Susu coaches, never cheats."
- Floaty subtle motion.

### 5. Leagues & trophies showcase
- The 2-week season story: a horizontal trophy progression (Bronze → Silver → Gold → Rose → Purple → Diamond) using the existing trophy artwork assets, each tier labeled.
- A "fire" streak chip and a sample ranked row (medal for #1) to imply the leaderboard.
- Caption: "Two-week seasons. Promotion is the goal."

### 6. Final CTA
- Full-width cinematic banner: Studly logo (glow), "Start watching tonight.", the primary "Create your first series" button (cta-studio + cta-sheen), and a quiet "I already study here" ghost link.
- Ambience behind it.

## Non-goals
- No new routes, no auth, no database reads (landing is unauthenticated — all visuals are mocks).
- No change to the player or create wizard themselves.

## Technical notes
- New content data (shelf series, steps, Susu sample, tiers) as small const arrays at the top of `index.tsx` (or a tiny `src/components/landing/` file if it gets long).
- Reuse existing motion components; the live preview uses a local `useState`/`useEffect` timer loop (no requestAnimationFrame needed for a looping slide).
- Trophy imports: `src/assets/trophies/*.png.asset.json`.
- All colors via semantic tokens; no hardcoded color utilities.
- Head metadata stays; minor description tweak only if needed.

## Verification
- Build passes (tsgo).
- Playwright: open `/`, screenshot hero live preview playing, scroll through each section, confirm no overlap and all sections paint on first load.
