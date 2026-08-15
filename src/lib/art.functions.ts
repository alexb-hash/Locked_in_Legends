import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

type Frame = { kind: string; url: string };

/**
 * Generates the animated presenter art for one cast member: a master character sheet drawn
 * from the uploaded photo as a likeness reference, then a pose set generated against that
 * master so the face stays consistent. The uploaded photo itself is never shown to students.
 */
export const generateCharacterArt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { characterId: string; seriesId: string }) => input)
  .handler(async ({ data, context }): Promise<{ frames: Frame[] }> => {
    const { generateImage, masterPrompt, toDataUrl, POSES } = await import("./art.server");
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("character_frames")
      .select("kind, url")
      .eq("character_id", data.characterId)
      .eq("series_id", data.seriesId);
    if (existing && existing.length >= POSES.length) return { frames: existing as Frame[] };

    const { data: character } = await supabase
      .from("characters")
      .select("id, name, role_description, image_urls")
      .eq("id", data.characterId)
      .maybeSingle();
    if (!character) return { frames: [] };

    const refUrl = (character.image_urls ?? [])[0];
    const reference = refUrl ? await toDataUrl(refUrl) : null;

    const masterBytes = await generateImage(
      masterPrompt(character.name, character.role_description, Boolean(reference)),
      reference ? [reference] : [],
    );
    if (!masterBytes) return { frames: [] };

    const upload = async (kind: string, bytes: Uint8Array) => {
      const path = `${userId}/${data.seriesId}/${data.characterId}-${kind}.png`;
      const { error } = await supabase.storage
        .from("character-art")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (error) return null;
      const { data: signed } = await supabase.storage.from("character-art").createSignedUrl(path, YEAR_SECONDS);
      return signed?.signedUrl ?? null;
    };

    const masterUrl = await upload("master", masterBytes);
    const masterRef = masterUrl ? await toDataUrl(masterUrl) : null;

    const frames: Frame[] = [];
    for (const pose of POSES) {
      const bytes =
        pose.kind === "mouth_closed" && !masterRef
          ? masterBytes
          : await generateImage(pose.prompt, masterRef ? [masterRef] : []);
      if (!bytes) continue;
      const url = await upload(pose.kind, bytes);
      if (url) frames.push({ kind: pose.kind, url });
    }

    // Guarantee at least the neutral pose so the player always has something drawn to show.
    if (!frames.some((f) => f.kind === "mouth_closed") && masterUrl) {
      frames.unshift({ kind: "mouth_closed", url: masterUrl });
    }

    if (frames.length) {
      await supabase.from("character_frames").upsert(
        frames.map((f) => ({
          owner_id: userId,
          character_id: data.characterId,
          series_id: data.seriesId,
          kind: f.kind,
          url: f.url,
        })),
        { onConflict: "character_id,series_id,kind" },
      );
    }

    return { frames };
  });

/** Generates one backdrop still per slide of an episode and stores it on the slide row. */
export const generateSceneArt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { episodeId: string; topic: string }) => input)
  .handler(async ({ data, context }): Promise<{ made: number }> => {
    const { generateImage, scenePrompt } = await import("./art.server");
    const { supabase, userId } = context;

    const { data: slides } = await supabase
      .from("episode_slides")
      .select("id, title, order_index, art_url")
      .eq("episode_id", data.episodeId)
      .order("order_index", { ascending: true });
    if (!slides?.length) return { made: 0 };

    let made = 0;
    for (const slide of slides) {
      if (slide.art_url) continue;
      const bytes = await generateImage(scenePrompt(data.topic, slide.title));
      if (!bytes) continue;
      const path = `${userId}/scenes/${data.episodeId}-${slide.order_index}.png`;
      const { error } = await supabase.storage
        .from("character-art")
        .upload(path, bytes, { contentType: "image/png", upsert: true });
      if (error) continue;
      const { data: signed } = await supabase.storage.from("character-art").createSignedUrl(path, YEAR_SECONDS);
      if (!signed?.signedUrl) continue;
      await supabase.from("episode_slides").update({ art_url: signed.signedUrl }).eq("id", slide.id);
      made += 1;
    }
    return { made };
  });
