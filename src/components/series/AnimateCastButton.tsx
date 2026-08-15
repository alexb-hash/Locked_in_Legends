import { useServerFn } from "@tanstack/react-start";
import { Loader2, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generateCharacterArt, generateSceneArt } from "@/lib/art.functions";

/**
 * Generates the animated presenter art for an existing series. Uploaded cast photos are used
 * only as likeness references — every pose that plays in the episode is newly generated.
 */
export function AnimateCastButton({ seriesId, topic }: { seriesId: string; topic: string }) {
  const makeCast = useServerFn(generateCharacterArt);
  const makeScenes = useServerFn(generateSceneArt);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const [{ data: cast }, { data: episodes }] = await Promise.all([
        supabase.from("series_characters").select("character_id").eq("series_id", seriesId),
        supabase.from("episodes").select("id").eq("series_id", seriesId).order("order_index", { ascending: true }),
      ]);
      if (!cast?.length) {
        toast.error("Add a cast member to this series first.");
        return;
      }
      toast.info("Drawing your cast — this takes a minute.");
      await Promise.all(cast.map((c) => makeCast({ data: { characterId: c.character_id, seriesId } }).catch(() => null)));
      await Promise.all(
        (episodes ?? []).map((e) => makeScenes({ data: { episodeId: e.id, topic } }).catch(() => null)),
      );
      toast.success("Presenter art is ready — press play.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the artwork.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="press rounded-xl" disabled={busy} onClick={run}>
      {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Wand2 className="mr-1 size-4" />}
      {busy ? "Drawing…" : "Animate cast"}
    </Button>
  );
}
