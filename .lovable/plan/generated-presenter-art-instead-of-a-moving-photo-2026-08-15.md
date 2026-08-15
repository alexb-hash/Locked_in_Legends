# Generated presenter art instead of a moving photo

Yes — this is the right way to do it. The uploaded cast photo stops being the thing on screen and becomes only a *reference* fed to the image model. Everything the student sees is newly generated art, so we can generate several poses of the same character and cycle them to create real animation instead of warping a photo.

## What changes for the user

1. When a series is created, each cast member's uploaded photo is sent to the image model as a likeness reference. The model returns a stylized illustrated version of that character — same face structure, consistent outfit and lighting, transparent-friendly plain backdrop.
2. For that character we generate a small **pose set** (mouth closed, mouth half-open, mouth wide, eyes closed/blink, plus a gesture pose).
3. Each scene also gets its own generated **classroom/backdrop still** matched to the lesson topic.
4. The player composites: generated backdrop → generated character pose cycling in time with the narration → lesson text in its own column. The mouth now actually changes shape between drawn frames, which reads as talking; blinks come from the eyes-closed frame.
5. Generation happens once per series and is cached in storage, so playback is instant and costs nothing on replay.

## Animation model

The 24fps broadcast clock stays. On top of it:
- Talking: pose frames swap on a ~10–12fps cadence (drawn animation cadence — 24 swaps/sec would strobe) driven by the narration's speaking state.
- Idle: closed-mouth pose with breathing drift; blink frame inserted every ~3–4s for 2 frames.
- Camera: slow push/parallax between character layer and backdrop for depth.

## Fallbacks (so nothing ever looks broken)

- No cast photo uploaded → generate a character purely from the topic/description.
- Image generation fails or is still running → play with the generated backdrop and text only (no photo warping ever returns).
- While a series is generating, the loading screen shows the poses appearing as they stream in.

## Technical section

- New table `character_frames` (character_id, series_id, kind: `mouth_closed|mouth_mid|mouth_open|blink|gesture`, url) plus a new public-read `character-art` storage bucket; RLS scoped to the owner, with GRANTs.
- New server route `src/routes/api/generate-character-art.ts` calling `https://ai.gateway.lovable.dev/v1/images/generations` with `google/gemini-3.1-flash-image`, passing the uploaded photo as an `image_url` reference part plus a per-pose prompt; streaming so the create screen shows progress. Same model for the per-scene backdrop.
- Pose consistency: one "master" character sheet is generated first, then each pose is generated using the master as the reference image so the face and outfit don't drift.
- `PresenterStage` is rewritten to a frame-cycling layer (preloaded `Image` objects, pose chosen from the frame index + speaking state) — the photo-warp code is gone.
- `watch.$episodeId.tsx` loader fetches the pose set and scene backdrops; the two-column layout stays so art never covers the lesson text.
- Generation runs during series creation (with per-scene art queued after the script), cached by `series_id` so replays are free.
