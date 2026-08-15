import { useMemo } from "react";
import { cn } from "@/lib/utils";

const FPS = 24;

/**
 * The on-air presenter: a cinematic broadcast portrait of the cast member.
 *
 * Rather than warping the face (which reads as a cropped mouth flapping), the portrait is
 * treated like a real studio shot — a slow dolly/breath, a graded rim light that sweeps the
 * frame, a bloom that pulses with the voice, and a live waveform under the name plate.
 * Everything is derived from the same 24fps frame index as the lesson, so it stays in sync.
 */
export function PresenterStage({
  src,
  name,
  speaking,
  frame,
  className,
}: {
  src: string;
  name: string;
  speaking: boolean;
  frame: number;
  className?: string;
}) {
  const look = useMemo(() => {
    const t = frame / FPS;
    const breath = Math.sin(t / 2.7);
    const sway = Math.sin(t / 3.9);
    const bob = Math.cos(t / 3.1);
    // Voice energy: layered sines so the bloom + waveform feel like speech, not a metronome.
    const energy = speaking
      ? 0.55 + 0.45 * Math.abs(Math.sin(t * 6.1) * 0.6 + Math.sin(t * 9.7) * 0.4)
      : 0.12;
    return {
      portrait: {
        transform: `scale(${(1.06 + breath * 0.012 + energy * 0.006).toFixed(4)}) translate3d(${(sway * 1.1).toFixed(2)}%, ${(bob * 0.9).toFixed(2)}%, 0)`,
      } as React.CSSProperties,
      bloom: { opacity: 0.25 + energy * 0.5, transform: `scale(${(1 + energy * 0.06).toFixed(3)})` } as React.CSSProperties,
      sweep: { transform: `translateX(${(((t * 14) % 260) - 130).toFixed(1)}%) rotate(12deg)` } as React.CSSProperties,
      bars: Array.from({ length: 14 }, (_, i) => {
        const v = speaking
          ? 0.25 + 0.75 * Math.abs(Math.sin(t * (5.5 + i * 0.55) + i))
          : 0.12 + 0.05 * Math.abs(Math.sin(t * 1.4 + i));
        return v;
      }),
      energy,
    };
  }, [frame, speaking]);

  return (
    <div className={cn("relative isolate select-none", className)}>
      {/* Bloom / on-air halo */}
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_50%_40%,oklch(0.63_0.115_300/0.55),transparent_70%)] blur-2xl transition-none"
        style={look.bloom}
      />

      <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[oklch(0.1_0.012_290)] shadow-[0_30px_80px_-30px_oklch(0.2_0.06_300/0.9)]">
        {/* Studio backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,oklch(0.28_0.06_300/0.8),transparent_65%)]" />

        {/* Graded portrait */}
        <img
          src={src}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover object-top will-change-transform"
          style={look.portrait}
          draggable={false}
        />

        {/* Colour grade + vignette so the photo reads as a broadcast shot */}
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.02_300)] via-transparent to-[oklch(0.63_0.115_300/0.18)] mix-blend-soft-light" />
        <div className="absolute inset-0 bg-[radial-gradient(110%_80%_at_50%_35%,transparent_45%,oklch(0.08_0.01_290/0.85)_100%)]" />

        {/* Rim-light sweep */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -inset-y-1/2 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/12 to-transparent blur-md"
            style={look.sweep}
          />
        </div>

        {/* On-air badge */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2 py-1 backdrop-blur-md">
          <span
            className="size-1.5 rounded-full bg-red-400"
            style={{ opacity: 0.4 + look.energy * 0.6, boxShadow: "0 0 8px oklch(0.7 0.18 25)" }}
          />
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-white/85">On air</span>
        </div>

        {/* Name plate + live waveform */}
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-8">
          <p className="truncate text-[0.72rem] font-semibold tracking-tight text-white">{name}</p>
          <div className="flex h-4 items-end gap-[3px]">
            {look.bars.map((v, i) => (
              <span
                key={i}
                className="w-full rounded-full bg-primary/85"
                style={{ height: `${Math.max(8, v * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
