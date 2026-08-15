import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const FPS = 24;
/** Drawn animation cadence: poses swap ~12 times a second so it reads as speech, not a strobe. */
const SWAP_EVERY = 2;

export type PresenterFrames = Partial<Record<"mouth_closed" | "mouth_mid" | "mouth_open" | "blink" | "gesture", string>>;

/**
 * The on-air presenter, drawn entirely from AI-generated artwork.
 *
 * The cast member's uploaded photo is only ever a likeness reference during generation — what
 * plays here is a set of generated poses cycled on the same 24fps clock as the lesson, so the
 * mouth genuinely changes shape between drawn frames and blinks land naturally.
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
  const order = useMemo(() => {
    const talk = [frames.mouth_closed, frames.mouth_mid, frames.mouth_open, frames.mouth_mid, frames.gesture].filter(
      (u): u is string => Boolean(u),
    );
    return {
      talk: talk.length ? talk : [frames.mouth_closed ?? ""].filter(Boolean),
      idle: frames.mouth_closed ?? frames.mouth_mid ?? frames.gesture ?? "",
      blink: frames.blink ?? "",
    };
  }, [frames]);

  // Preload every pose so a swap never flashes an empty frame.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const urls = [...new Set([...order.talk, order.idle, order.blink].filter(Boolean))];
    if (!urls.length) return;
    let left = urls.length;
    urls.forEach((u) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        left -= 1;
        if (left <= 0) setReady(true);
      };
      img.src = u;
    });
  }, [order]);

  const look = useMemo(() => {
    const t = frame / FPS;
    const step = Math.floor(frame / SWAP_EVERY);
    // Blink for ~2 drawn frames every ~3.5s.
    const blinking = Boolean(order.blink) && frame % Math.round(FPS * 3.5) < 3;
    const src = blinking ? order.blink : speaking && order.talk.length ? order.talk[step % order.talk.length]! : order.idle;
    const breath = Math.sin(t / 2.6);
    const sway = Math.sin(t / 3.8);
    const energy = speaking ? 0.55 + 0.45 * Math.abs(Math.sin(t * 6.1) * 0.6 + Math.sin(t * 9.7) * 0.4) : 0.12;
    return {
      src,
      energy,
      portrait: {
        transform: `scale(${(1.04 + breath * 0.012).toFixed(4)}) translate3d(${(sway * 0.9).toFixed(2)}%, ${(breath * 0.6).toFixed(2)}%, 0)`,
      } as React.CSSProperties,
      bloom: { opacity: 0.22 + energy * 0.5, transform: `scale(${(1 + energy * 0.05).toFixed(3)})` } as React.CSSProperties,
      bars: Array.from({ length: 14 }, (_, i) =>
        speaking ? 0.25 + 0.75 * Math.abs(Math.sin(t * (5.5 + i * 0.55) + i)) : 0.12 + 0.05 * Math.abs(Math.sin(t * 1.4 + i)),
      ),
    };
  }, [frame, order, speaking]);

  if (!look.src) return null;

  return (
    <div className={cn("relative isolate select-none", className)}>
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,oklch(0.63_0.115_300/0.5),transparent_70%)] blur-2xl"
        style={look.bloom}
      />

      <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[oklch(0.1_0.012_290)] shadow-[0_30px_80px_-30px_oklch(0.2_0.06_300/0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,oklch(0.28_0.06_300/0.8),transparent_65%)]" />

        <img
          key={look.src}
          src={look.src}
          alt={name}
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-top will-change-transform",
            ready ? "opacity-100" : "opacity-0",
          )}
          style={look.portrait}
          draggable={false}
        />

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
