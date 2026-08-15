import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Broadcast frame rate for the presenter: 24fps, one frame every ~41.67ms. */
const FPS = 24;
const FRAME_MS = 1000 / FPS;

/**
 * Renders the cast member's reference photo as a live anchor: a 24fps canvas loop that
 * re-composites the face every frame — blinking eyelids and a fluid talking mouth cycle —
 * so the lesson reads as a person broadcasting rather than a static portrait.
 */
export function PresenterCanvas({
  src,
  speaking,
  name,
  className,
}: {
  src: string;
  speaking: boolean;
  name?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const speakingRef = useRef(speaking);
  const [ready, setReady] = useState(false);

  speakingRef.current = speaking;

  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setReady(true);
    };
    img.onerror = () => setReady(false);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 320;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    // Cover-fit the source photo into the frame.
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let frame = 0;

    /** Composites a single 24fps frame: head motion, eyelid blink, mouth cycle. */
    const draw = () => {
      const t = frame / FPS;
      const talking = speakingRef.current;

      // Head motion — a gentle broadcast sway plus a breath bob.
      const sway = Math.sin(t * 0.9) * 0.9;
      const bob = Math.cos(t * 1.3) * 0.7;
      const breathe = 1 + Math.sin(t * 1.1) * 0.004;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2 + sway, h / 2 + bob);
      ctx.scale(breathe, breathe);
      ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(img, dx, dy, dw, dh);

      // ---- Mouth cycle -------------------------------------------------------
      // Layered sines give an irregular, fluid articulation instead of a metronome flap.
      const envelope = talking
        ? Math.max(
            0,
            0.55 +
              0.45 * Math.sin(t * 13.2) +
              0.28 * Math.sin(t * 7.7 + 1.1) +
              0.16 * Math.sin(t * 21.3 + 0.4),
          ) / 1.44
        : Math.max(0, 0.06 + 0.06 * Math.sin(t * 1.7));
      const open = Math.min(1, envelope);

      const mouthTop = dy + dh * 0.6;
      const mouthH = dh * 0.19;
      const mouthX = dx + dw * 0.26;
      const mouthW = dw * 0.48;
      const stretch = 1 + open * 0.55;
      const jaw = mouthH * open * 0.14;

      ctx.save();
      ctx.beginPath();
      ctx.rect(mouthX, mouthTop, mouthW, mouthH + jaw);
      ctx.clip();
      ctx.drawImage(
        img,
        (mouthX - dx) / scale,
        (mouthTop - dy) / scale,
        mouthW / scale,
        mouthH / scale,
        mouthX,
        mouthTop + jaw * 0.35,
        mouthW,
        mouthH * stretch,
      );
      // A soft inner-mouth shadow so the opening reads as depth, not just a stretch.
      if (open > 0.12) {
        const cx = mouthX + mouthW / 2;
        const cy = mouthTop + mouthH * 0.55 + jaw * 0.4;
        ctx.globalAlpha = Math.min(0.5, open * 0.5);
        ctx.fillStyle = "rgba(20,8,24,1)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, mouthW * 0.17, mouthH * 0.1 * (0.35 + open), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // ---- Blink -------------------------------------------------------------
      // Blinks land on whole frames roughly every 3.2s, each lasting ~5 frames.
      const blinkPeriod = FPS * 3.2;
      const phase = frame % Math.round(blinkPeriod);
      const blink = phase < 5 ? Math.sin((phase / 5) * Math.PI) : 0;
      if (blink > 0.02) {
        const eyeTop = dy + dh * 0.34;
        const eyeH = dh * 0.1;
        const eyeX = dx + dw * 0.2;
        const eyeW = dw * 0.6;
        // Pull the lid skin from just above the eyes down over them.
        ctx.save();
        ctx.beginPath();
        ctx.rect(eyeX, eyeTop, eyeW, eyeH);
        ctx.clip();
        ctx.drawImage(
          img,
          (eyeX - dx) / scale,
          (eyeTop - dy - eyeH * 0.85) / scale,
          eyeW / scale,
          eyeH / scale,
          eyeX,
          eyeTop,
          eyeW,
          eyeH * (0.15 + 0.95 * blink),
        );
        ctx.restore();
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      carry += now - last;
      last = now;
      const steps = Math.floor(carry / FRAME_MS);
      if (steps > 0) {
        carry -= steps * FRAME_MS;
        frame += steps;
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    draw();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-primary/25 bg-black/40", className)}>
      <canvas ref={canvasRef} className="size-full" aria-hidden />
      {!ready && <div className="absolute inset-0 animate-pulse bg-primary/10" />}
      <span className="sr-only">{name ? `${name} is presenting the lesson` : "Presenter"}</span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6">
        <span className={cn("size-1.5 rounded-full", speaking ? "bg-red-500" : "bg-white/40")} />
        <span className="truncate text-[10px] font-semibold uppercase tracking-widest text-white/85">
          {speaking ? "Live" : "On air"}
          {name ? ` · ${name}` : ""}
        </span>
      </div>
    </div>
  );
}
