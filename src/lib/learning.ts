import { awardXpFn, type AwardResult } from "@/lib/learning.functions";

export const XP = {
  correctAnswer: 10,
  episodeComplete: 20,
  perfectEpisode: 25,
} as const;

export type { AwardResult };

/** Grants XP through the server-side award engine. `sourceKey` makes the award idempotent. */
export async function awardXp(kind: string, amount: number, sourceKey?: string) {
  return await awardXpFn({ data: { kind, amount, ...(sourceKey ? { sourceKey } : {}) } });
}


let ctx: AudioContext | null = null;

/** Short, soft "pop" used for quiz pop-ups and correct answers. */
export function pop(variant: "in" | "correct" | "wrong" = "in") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    ctx ??= new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const [start, end] = variant === "wrong" ? [420, 180] : variant === "correct" ? [520, 880] : [320, 620];
    osc.type = "sine";
    osc.frequency.setValueAtTime(start, now);
    osc.frequency.exponentialRampToValueAtTime(end, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  } catch {
    /* audio is a nice-to-have */
  }
}
