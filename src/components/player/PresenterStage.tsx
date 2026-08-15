import { useEffect, useMemo, useState } from "react";

import presenterClosed from "@/assets/presenter-demo-closed.jpg";
import presenterMid from "@/assets/presenter-demo-mid.jpg";
import presenterOpen from "@/assets/presenter-demo-open.jpg";
import { cn } from "@/lib/utils";

const FPS = 60;

const FALLBACK_TALK = [presenterClosed, presenterMid, presenterOpen];

export type PresenterFrames = Partial<Record<"mouth_closed" | "mouth_mid" | "mouth_open" | "blink" | "gesture", string>>;

/** Deterministic value noise: smooth, non-repeating-looking, and identical on every client. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function noise(t: number) {
  const i = Math.floor(t);
  const f = t - i;
  const s = f * f * (3 - 2 * f);
  return hash(i) * (1 - s) + hash(i + 1) * s;
}

/**
 * The on-air presenter, drawn entirely from AI-generated artwork.
 *
 * The uploaded photo is only a likeness reference during generation. What plays here is a
 * generated pose set driven by a synthetic speech envelope on the 60fps lesson clock: syllable
 * bursts with real pauses, minimum viseme hold times, irregular blinks (sometimes doubles) and
 * layered head motion — so it reads as a person talking rather than a 3-frame loop.
 */
export function PresenterStage({
  frames,
  name,
  speaking,
  frame,
  className,
}: {
  frames: PresenterFrames;
  name: string;
  speaking: boolean;
  frame: number;
  className?: string;
}) {
  // Any pose that fails to load (expired signed URL, missing object) is retired so the cycle
  // falls back to the built-in illustrated anchor instead of flashing a broken frame.
  const [broken, setBroken] = useState<Record<string, true>>({});

  const poses = useMemo(() => {
    const ok = (u?: string | null) => (u && !broken[u] ? u : undefined);
    const closed = ok(frames.mouth_closed);
    const mid = ok(frames.mouth_mid);
    const open = ok(frames.mouth_open);
    const distinct = new Set([closed, mid, open].filter(Boolean)).size;
    // A single generated still is not an animation — only trust generated art once there are at
    // least two distinct mouth poses, otherwise use the built-in three-pose set.
    if (distinct < 2) {
      return {
        closed: FALLBACK_TALK[0]!,
        mid: FALLBACK_TALK[1]!,
        open: FALLBACK_TALK[2]!,
        blink: "",
        gesture: "",
      };
    }
    const base = closed ?? mid ?? open!;
    return {
      closed: base,
      mid: mid ?? open ?? base,
      open: open ?? mid ?? base,
      blink: ok(frames.blink) ?? "",
      gesture: ok(frames.gesture) ?? "",
    };
  }, [broken, frames]);

  const layers = useMemo(
    () => [...new Set([poses.closed, poses.mid, poses.open, poses.blink, poses.gesture].filter(Boolean))],
    [poses],
  );

  // Preload every pose so the first swap never flashes an empty frame.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!layers.length) {
      setReady(true);
      return;
    }
    let left = layers.length;
    layers.forEach((u) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        left -= 1;
        if (left <= 0) setReady(true);
      };
      img.src = u;
    });
  }, [layers]);

  const look = useMemo(() => {
    const t = frame / FPS;

    // Phrasing: ~2.2s of speech, then a short breath pause of varying length.
    const phrase = Math.floor(t / 2.9);
    const inPhrase = t - phrase * 2.9;
    const pauseAt = 1.9 + noise(phrase * 3.3) * 0.7;
    const voiced = speaking && inPhrase < pauseAt;

    // Syllables land irregularly (4–7 per second) with varying loudness, so the mouth never
    // ticks on a fixed beat.
    const rate = 4.4 + noise(t * 0.37 + 11) * 2.6;
    const syllable = t * rate;
    const within = syllable - Math.floor(syllable);
    const loud = 0.45 + noise(Math.floor(syllable) * 1.7) * 0.55;
    const burst = Math.sin(Math.min(1, within / (0.55 + noise(Math.floor(syllable) * 5.1) * 0.35)) * Math.PI);
    const openness = voiced ? Math.max(0, burst * loud) : 0.02 + (speaking ? noise(t * 1.3) * 0.05 : 0);

    // Minimum viseme hold: quantize to ~14fps so drawn poses read as animation, not strobe.
    const held = Math.round(openness * 3) / 3;
    const mouth = held > 0.62 ? "open" : held > 0.28 ? "mid" : "closed";

    // Blinks: irregular 2.6–6s gaps, occasionally doubled.
    const blinkSeed = Math.floor(t / 4);
    const blinkAt = blinkSeed * 4 + 0.6 + noise(blinkSeed * 9.1) * 2.8;
    const dt = t - blinkAt;
    const double = noise(blinkSeed * 2.7) > 0.72;
    const blinking =
      Boolean(poses.blink) && ((dt > 0 && dt < 0.11) || (double && dt > 0.22 && dt < 0.32));

    // Gesture beat during pauses only, so it feels like punctuation.
    const gesturing = Boolean(poses.gesture) && !voiced && speaking && noise(phrase * 7.7) > 0.55 && inPhrase > pauseAt + 0.15;

    const active = blinking ? poses.blink : gesturing ? poses.gesture : mouth === "open" ? poses.open : mouth === "mid" ? poses.mid : poses.closed;

    // Head motion: three drifting frequencies plus a slow micro-saccade, so no visible loop.
    const breath = Math.sin(t * 0.62) * 0.6 + Math.sin(t * 0.29 + 1.2) * 0.4;
    const swayX = Math.sin(t * 0.41) * 0.7 + Math.sin(t * 0.97 + 2.1) * 0.25 + (noise(t * 0.6) - 0.5) * 0.5;
    const swayY = Math.sin(t * 0.53 + 0.8) * 0.45 + (noise(t * 0.8 + 40) - 0.5) * 0.4;
    const tilt = Math.sin(t * 0.34 + 0.4) * 0.7 + (noise(t * 0.5 + 90) - 0.5) * 0.6;
    const emphasis = voiced ? openness * 0.35 : 0;
    const energy = voiced ? 0.35 + openness * 0.65 : 0.12;

    return {
      active,
      energy,
      portrait: {
        transform: `translate3d(${(swayX * 0.9).toFixed(2)}%, ${(swayY * 0.7 + breath * 0.35 - emphasis * 0.4).toFixed(2)}%, 0) rotate(${tilt.toFixed(2)}deg) scale(${(1.05 + breath * 0.008 + emphasis * 0.006).toFixed(4)})`,
      } as React.CSSProperties,
      bloom: { opacity: 0.2 + energy * 0.5, transform: `scale(${(1 + energy * 0.05).toFixed(3)})` } as React.CSSProperties,
      bars: Array.from({ length: 14 }, (_, i) =>
        voiced
          ? 0.15 + openness * (0.55 + noise(t * (7 + i) + i * 3.1) * 0.65)
          : 0.1 + 0.05 * Math.abs(Math.sin(t * 1.3 + i)),
      ),
    };
  }, [frame, poses, speaking]);

  return (
    <div className={cn("relative isolate select-none", className)}>
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,oklch(0.63_0.115_300/0.5),transparent_70%)] blur-2xl"
        style={look.bloom}
      />

      <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[oklch(0.1_0.012_290)] shadow-[0_30px_80px_-30px_oklch(0.2_0.06_300/0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,oklch(0.28_0.06_300/0.8),transparent_65%)]" />

        {/* All poses stay mounted and stacked; only opacity changes, so a viseme swap is a fast
            cross-dissolve instead of a hard cut. */}
        <div className="absolute inset-0 will-change-transform" style={look.portrait}>
          {layers.map((u) => (
            <img
              key={u}
              src={u}
              alt={u === look.active ? name : ""}
              aria-hidden={u !== look.active}
              onError={() => setBroken((b) => (b[u] ? b : { ...b, [u]: true }))}
              className={cn(
                "absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-[45ms] ease-linear",
                ready && u === look.active ? "opacity-100" : "opacity-0",
              )}
              draggable={false}
            />
          ))}
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_35%,transparent_50%,oklch(0.08_0.01_290/0.8)_100%)]" />

        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2 py-1 backdrop-blur-md">
          <span
            className="size-1.5 rounded-full bg-red-400"
            style={{ opacity: 0.4 + look.energy * 0.6, boxShadow: "0 0 8px oklch(0.7 0.18 25)" }}
          />
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/85">On air</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
          <p className="truncate text-[0.72rem] font-semibold tracking-tight text-white">{name}</p>
          <div className="flex h-4 items-end gap-[3px]">
            {look.bars.map((v, i) => (
              <span key={i} className="w-full rounded-full bg-primary/85" style={{ height: `${Math.max(8, v * 100)}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
