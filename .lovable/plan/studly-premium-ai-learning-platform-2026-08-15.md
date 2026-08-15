# Studly — premium AI learning platform

A dreamy, very-dark-gray learning app that blends Netflix-style lesson episodes, Duolingo
streaks and leagues, a ChatGPT-style AI tutor, and Anki-style flashcards. Built in phases so
each layer is real and persistent, not a mockup.

## Design system (built first, applied everywhere)

- Very dark gray canvas, white primary text, muted purple secondary text and accents.
- Flat surfaces with subtle muted-purple gradients, soft purple glow, generous rounding and
  premium spacing. No neon.
- Motion system as reusable primitives: blur-in reveals, staggered lists, floating cards,
  drifting aurora blobs, twinkles, fluid hover/press transitions on buttons, links, cards, nav.
- All colors as semantic tokens in the global stylesheet; a display + body font pair loaded
  in the root route. Respects reduced-motion.

## Phase 1 — Foundation

- Lovable Cloud enabled: full relational schema, RLS, and the three storage buckets
  (`materials`, `characters`, `avatars`, all private with owner-only policies).
- Auth pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`, with a working
  "Forgot password?" link and a real reset flow (emailed recovery link → set new password).
- Hidden admin account `adminns` seeded, flagged via a separate roles table. Admins are
  excluded from leaderboards, XP rankings, and student discovery at the query and policy level.
- Collapsible icon-rail sidebar with expandable Learn / Compete / Community groups, active-route
  highlighting, persisted expand/collapse state, footer settings cog opening tab-visibility
  checkboxes, and a "Talk to Susu" item. `/cast` in nav; `/create` reachable but not a nav tab.
- Profile page: avatar upload to the private bucket with a signed URL on the profile, plus XP,
  league, streak, badges, completed episodes and correct-answer stats. Clickable public
  student profiles showing public info and unlocked badges.

## Phase 2 — Learning core

- Episode/lesson player that renders a real slide deck: each slide has a title, several
  substantive bullets, and a key takeaway. Tracks current episode, last-viewed position,
  per-series last episode, and completion.
- Pop-quiz system: animated entry, cute pop sound, a genuinely functional countdown timer,
  correct/incorrect feedback, an explanation on every question, and "Ask the AI tutor about
  this" that opens Susu preloaded with the question, the student's answer, and context.
- XP engine with idempotent events: +20 finish episode, +5 correct question, +25 all-correct
  episode, +20 for a 3-day streak, +50 for a 7-day streak. No double awards on refresh.
- Streak system: only episode completion counts; header fire icon gray until today's episode
  is done, then lit muted purple. Streak history stored so consecutive days compute correctly.

## Phase 3 — Susu, chat, flashcards

- Susu AI tutor with academic-integrity guardrails: hints, explanations, Socratic coaching,
  worked examples; refuses to produce graded work or pass AI work off as the student's own.
  Suggested follow-up questions after every reply. Floating tutor available app-wide, opening
  with lesson/quiz context when launched from there.
- Multi-conversation chat: history sidebar, New Chat, rename, delete, auto-cleanup of chats
  unopened for a month, image attachments (photograph a question and get coached),
  in-chat flashcard-deck generation with "Add to my decks", and inline mini-quizzes reusing
  the pop-quiz UI. Stored in `chat_threads` / `chat_messages`.
- `/flashcards`: AI-generated decks from a topic or uploaded material, flip-card study mode,
  front/back cards, progress tracking, delete with confirmation, decks added from Susu chats.

## Phase 4 — Create wizard and cast

- `/create` wizard: build a series from a topic, PDF, PPT/PPTX, MP4, images, or pasted material.
- Real paste support with a defensive onPaste handler inserting at the caret, a "Paste from
  clipboard" button, and a real upload button accepting PDF/PPT/PPTX/MP4 up to 25 MB, shown as
  inline chips, stored in the `materials` bucket and recorded in `study_materials`.
- Every character row gets a real photo uploader supporting multiple photos; on generation the
  photos go to the `characters` bucket, URLs are saved to `characters.image_urls`, and characters
  are linked to the generated series and episodes.
- `/cast`: view, add, photograph, re-photograph, delete and reuse cast members.
- Step 4 generation screen: film-reel animation, rotating production stages, film/education
  facts, a real progress bar, and per-episode tiles showing title and status that light up with
  a checkmark on completion, animating between states — driven by real job polling.

## Phase 5 — Competition

- Trophy-based leagues with 2-week seasons: top 5 promote, bottom 5 demote.
- Leaderboard with student avatars, name, XP, rank, distinct treatment for 1st/2nd/3rd, and a
  cute numbered ranking design. Admins never appear.
- Promotion popup animating the old trophy morphing into the new one, celebrating the league,
  with a "See the leaderboard" button. Trophy art uses your uploaded images once attached —
  until then styled placeholders sized to drop them straight in.
- Badges with animated unlock popups, shown on private and public profiles: Bookworm (50
  episodes), Quiz Master (100 correct), Locked In (30-day streak), Fast and Furious (5 episodes
  in a day), Academic Weapon (#1 in the top league).

## Video generation

You chose to hold off on the OpenAI Video API, so episodes render as cinematic animated
slide-deck players with real generated scripts, characters and narration-style pacing, and the
generation pipeline runs as real background jobs with real status polling. The job layer is
written behind `createVideoJob` / `getVideoJob` server-side abstractions, so adding the OpenAI
Video API later is a swap inside those two functions — with character reference photos passed
through where the API supports them. No API key ever touches the browser.

## Technical notes

- Lovable Cloud (Postgres + auth + storage) with tables for profiles, series, episodes,
  episode_slides, series_characters, characters, study_materials, progress, chat_threads,
  chat_messages, flashcard_decks, flashcards, quiz_attempts, xp_events, streaks, badges,
  user_badges, leagues, league_seasons, leaderboard_entries — foreign keys, indexes, timestamps,
  per-user ownership, cascade deletes so removing a series cleans up its episodes, slides,
  character links, materials and progress.
- RLS on every table; roles in a dedicated table checked through a security-definer function,
  never on the profile row. Storage policies restrict each user to their own files.
- All AI and generation calls run server-side through Lovable AI; keys stay in server env.
- XP and streak math enforced server-side with uniqueness constraints for idempotency.
- Route-level metadata on every page; mobile-responsive layouts and keyboard/ARIA support.

Phase 1 lands first and is usable on its own; I'll continue through the phases from there.
