import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const FPS = 60;

export type PresenterFrames = Partial<Record<"mouth_closed" | "mouth_mid" | "mouth_open" | "blink" | "gesture", string>>;

/**
 * A stable on-air portrait for the selected cast member.
 *
 * AI pose renders are separate full illustrations, so rapidly cross-fading them creates visible
 * face and lighting flashes. The player therefore keeps one neutral generated portrait mounted
 * and adds only subtle, continuous 60fps breathing and camera motion. This preserves the selected
 * person's identity and avoids strobing, hard swaps, or clunky head movement.
 */
export function PresenterStage({
  frames,
  name,
  speaking,
  mouth,
  frame,
  className,
}: {
  frames: PresenterFrames;
  name: string;
  speaking: boolean;
  /** Mouth openness 0..1 derived from the word currently being spoken. */
  mouth?: number;
  frame: number;
  className?: string;
}) {
  const [broken, setBroken] = useState<Record<string, true>>({});
  const ok = (url: string | undefined) => (url && !broken[url] ? url : undefined);
  const portrait = useMemo(
    () =>
      [frames.mouth_closed, frames.mouth_mid, frames.mouth_open, frames.gesture]
        .find((url): url is string => Boolean(url && !broken[url])),
    [broken, frames.gesture, frames.mouth_closed, frames.mouth_mid, frames.mouth_open],
  );
  // Speech layers: mid then open, blended on top of the neutral portrait with continuous opacity so
  // the mouth reads as moving without any hard frame swap.
  const midLayer = ok(frames.mouth_mid) !== portrait ? ok(frames.mouth_mid) : undefined;
  const openLayer = ok(frames.mouth_open) !== portrait ? ok(frames.mouth_open) : undefined;

  const t = frame / FPS;
  const breath = Math.sin(t * 1.05);
  const drift = Math.sin(t * 0.34 + 0.8);
  const settle = Math.sin(t * 0.21 + 2.1);
  const activity = speaking ? 1 : 0.35;
  const portraitStyle: React.CSSProperties = {
    transform: `translate3d(${(drift * 0.22).toFixed(3)}%, ${(breath * -0.16 * activity).toFixed(3)}%, 0) rotate(${(settle * 0.12).toFixed(3)}deg) scale(${(1.035 + breath * 0.0018 * activity).toFixed(4)})`,
  };

  // Openness comes from the spoken word; it is low-pass filtered so the jaw has physical inertia
  // rather than snapping between letters, and capped so the mouth never yawns open mid-sentence.
  const smoothed = useRef(0);
  const target = speaking ? Math.max(0, Math.min(0.72, mouth ?? 0)) : 0;
  smoothed.current += (target - smoothed.current) * 0.22;
  const env = smoothed.current;
  // The mid-speech layer carries most of the articulation; the wide-open layer only ever peeks in.
  const midOpacity = Math.max(0, Math.min(1, env / 0.34)).toFixed(3);
  const openOpacity = Math.max(0, Math.min(0.55, (env - 0.44) / 0.5)).toFixed(3);


  return (
    <div className={cn("relative z-30 isolate select-none", className)}>
      <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" />

      <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-glow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,oklch(0.28_0.06_300/0.55),transparent_65%)]" />

        {portrait ? (
          <div className="absolute inset-0 will-change-transform" style={portraitStyle}>
            <img
              src={portrait}
              alt={`${name}, the selected presenter`}
              onError={() => setBroken((current) => ({ ...current, [portrait]: true }))}
              className="absolute inset-0 h-full w-full object-cover object-top"
              draggable={false}
            />
            {midLayer ? (
              <img
                src={midLayer}
                alt=""
                aria-hidden
                onError={() => setBroken((current) => ({ ...current, [midLayer]: true }))}
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: mouthOpacity(0.12) }}
                draggable={false}
              />
            ) : null}
            {openLayer ? (
              <img
                src={openLayer}
                alt=""
                aria-hidden
                onError={() => setBroken((current) => ({ ...current, [openLayer]: true }))}
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{ opacity: mouthOpacity(0.55) }}
                draggable={false}
              />
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center px-4 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/15 font-display text-lg font-semibold text-primary">
                {name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Preparing {name}</p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_35%,transparent_58%,oklch(0.08_0.01_290/0.72)_100%)]" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2 py-1 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-foreground/85">On air</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-background/95 to-transparent px-3 pb-3 pt-10">
          <p className="truncate text-[0.72rem] font-semibold text-foreground">{name}</p>
          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-border/70">
            <div className={cn("h-full rounded-full bg-primary/70", speaking ? "w-2/3" : "w-1/3")} />
          </div>
        </div>
      </div>
    </div>
  );
}