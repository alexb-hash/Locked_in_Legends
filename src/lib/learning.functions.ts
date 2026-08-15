import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AwardResult = {
  awarded: number;
  total_xp: number;
  current_streak: number;
  streak_incremented: boolean;
};

type AwardInput = { kind: string; amount: number; sourceKey?: string };

const ALLOWED_AWARDS: Record<string, number> = {
  quiz_correct: 10,
  episode_complete: 20,
  perfect_episode: 25,
};

/** Grants XP through the privileged award engine after verifying the caller. */
export const awardXpFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AwardInput) => {
    const kind = String(input?.kind ?? "");
    if (!(kind in ALLOWED_AWARDS)) throw new Error("Unknown award type.");
    const allowed = ALLOWED_AWARDS[kind]!;
    if (Number(input.amount) !== allowed) throw new Error("Invalid award amount.");
    const sourceKey = input.sourceKey ? String(input.sourceKey).slice(0, 120) : undefined;
    return { kind, amount: allowed, sourceKey };
  })
  .handler(async ({ data, context }): Promise<AwardResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("award_xp_for", {
      _user_id: context.userId,
      _kind: data.kind,
      _amount: data.amount,
      ...(data.sourceKey ? { _source_key: data.sourceKey } : {}),
    });

    if (error) throw new Error("Could not award XP right now.");
    const row = (Array.isArray(rows) ? rows[0] : rows) as AwardResult | undefined;
    return row ?? { awarded: 0, total_xp: 0, current_streak: 0, streak_incremented: false };
  });
