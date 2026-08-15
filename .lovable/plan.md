# Landing page: less bland, more broken-grid energy

Locked taste from your picks: dark gray base with deeper violet glows (#0d0d12 / #1a1726 / #4c3a8a / #a78bfa), Space Grotesk headings + DM Sans body, broken-grid composition. Focus: feature sections and motion.

## What changes

**Feature sections (the main fix)**
- Replace the current stacked, evenly-spaced card rows with a broken grid: tiles of unequal size that overlap and break their column edges, with a couple of elements bleeding past section boundaries.
- "How it works" becomes a layered numbered sequence — oversized ghost numerals behind each step card, steps offset left/right instead of centered.
- Susu spotlight and Leagues showcase get asymmetric treatment: content pushed off-center, mock UI card rotated slightly and overlapping a glowing violet aura panel.
- Add one dense bento-style capability block (flashcards, quizzes, episodes, XP) so the middle of the page isn't three near-identical bands.

**Motion**
- Scroll-linked parallax on the layered/overlapping elements so depth reads on scroll, not just fade-in.
- Upgrade reveals from uniform fade to staggered mask-wipe + slight rise, per-tile stagger.
- Hover states with real weight: tile lift, violet rim glow, subtle sheen sweep.
- Living background: slow drifting violet aurora blobs and a grain/noise layer behind the whole page.
- Headline gets a per-word entrance; the rotating subtitle keeps its cycle.
- All motion respects reduced-motion.

**Palette + type polish**
- Deepen violet accent tokens and add richer glow/aurora gradient tokens in the global stylesheet so contrast against the near-black base is stronger.
- Confirm Space Grotesk / DM Sans are wired as heading/body fonts, and push headline sizes/tracking harder for impact.

Untouched: hero demo broadcast preview stays as-is (you said hero is fine), all copy, and every app route behind auth.

## Technical notes

- Edits centered on `src/routes/index.tsx` (HowItWorks, SusuSpotlight, LeaguesShowcase, FinalCta, new bento block) plus token/keyframe additions in `src/styles.css`.
- New/updated shared bits: extend the existing `ScrollReveal` with variant + stagger support, add a small parallax hook, add an aurora/grain layer to the existing `Ambience` component.
- Colors stay semantic tokens in `src/styles.css` (oklch) — no hardcoded hex in components.
- Font links go in the root route head, not a CSS @import.
