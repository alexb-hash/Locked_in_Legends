import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Clapperboard,
  FileText,
  Flame,
  GraduationCap,
  Link2,
  Pause,
  Play,
  Layers,
  ListChecks,
  Sparkles,
  Trophy,
  Type,
  Users,
} from "lucide-react";

import castIris from "@/assets/cast/cast-iris.webp.asset.json";
import castLex from "@/assets/cast/cast-lex.webp.asset.json";
import castMo from "@/assets/cast/cast-mo.jpeg.asset.json";
import presenterClosed from "@/assets/presenter-demo-closed.jpg";
import presenterMid from "@/assets/presenter-demo-mid.jpg";
import presenterOpen from "@/assets/presenter-demo-open.jpg";
import sceneBackdrop from "@/assets/scene-demo-backdrop.jpg";
import { Ambience } from "@/components/motion/Ambience";
import {
  Floaty,
  MaskItem,
  MaskReveal,
  MaskRevealGroup,
  RevealItem,
  ScrollReveal,
  ScrollRevealGroup,
  WordReveal,
} from "@/components/motion/Reveal";
import { Parallax } from "@/components/motion/Parallax";
import { StudlyLogo } from "@/components/brand/StudlyLogo";
import { Markdown } from "@/components/chat/Markdown";
import { Button } from "@/components/ui/button";
import { LEAGUE_TIERS, TROPHIES } from "@/lib/trophies";

const ROTATING_SUBTITLES = [
  "Your notes, but actually watchable.",
  "Your friends, but they're teaching you.",
  "Your group chat, but somehow educational.",
  "Your revision, but make it a whole episode.",
  "Studying, but you actually wanna press play.",
];

function RotatingSubtitle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_SUBTITLES.length);
    }, 3600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto mt-4 h-[1.4em] max-w-xl">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, filter: "blur(14px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, filter: "blur(14px)", y: -8 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-x-0 font-sans text-lg font-light tracking-tight text-muted-foreground sm:text-xl"
        >
          {ROTATING_SUBTITLES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Hero — live auto-playing mini preview                            */
/* ------------------------------------------------------------------ */

const PREVIEW_SLIDE = {
  kicker: "Episode 3",
  title: "Why cells need mitochondria",
  bullets: [
    "ATP is the cell's spendable energy currency",
    "The inner membrane's folds multiply surface area",
    "More energy demand means more mitochondria",
  ],
  takeaway: "Structure follows the energy bill.",
  captions: [
    "So think of ATP as the cell's spendable cash…",
    "…and those folds? They buy more counter space.",
    "Which means: busy cells simply carry more of them.",
  ],
};

const PRESENTER_POSES = [presenterClosed, presenterMid, presenterOpen, presenterMid];

/**
 * Mirrors the real player: one 24fps broadcast clock drives the pose cycle,
 * the caption line, the bullet reveals and the camera drift — nothing is clicked.
 */
function HeroPreview() {
  const [tick, setTick] = useState(0); // frames on the 24fps grid
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setTick(Math.floor((now - start) / (1000 / 24)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused]);

  const LOOP = 24 * 9; // 9 second loop
  const f = tick % LOOP;
  const progress = f / LOOP;

  // 12fps drawn cadence for the mouth, blink beat every ~2.5s.
  const blinking = f % 60 > 55;
  const pose = PRESENTER_POSES[Math.floor(f / 2) % PRESENTER_POSES.length]!;
  const revealed = Math.min(PREVIEW_SLIDE.bullets.length, Math.floor(progress * (PREVIEW_SLIDE.bullets.length + 1)));
  const caption =
    PREVIEW_SLIDE.captions[Math.min(PREVIEW_SLIDE.captions.length - 1, Math.max(0, revealed - 1))]!;

  // Slow camera push on the generated backdrop, computed per frame like the player.
  const camScale = 1.06 + Math.sin(f / 90) * 0.03;
  const camX = Math.sin(f / 120) * 8;

  return (
    <Floaty className="mt-28 sm:mt-40" amount={10}>
      <div
        className="glass-card glow-ring mx-auto max-w-2xl overflow-hidden p-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* 16:9 stage */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
          {/* generated scene backdrop with a per-frame camera transform */}
          <img
            src={sceneBackdrop}
            alt=""
            aria-hidden
            width={1536}
            height={864}
            className="absolute inset-0 size-full object-cover opacity-70"
            style={{ transform: `scale(${camScale}) translateX(${camX}px)`, willChange: "transform" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/55 to-background/80" />

          {/* two-column broadcast: presenter left, lesson right */}
          <div className="relative grid h-full grid-cols-[26%_1fr] gap-3 p-4 sm:gap-5 sm:p-6">
            <div className="relative self-end overflow-hidden rounded-2xl ring-1 ring-border/70">
              <img
                src={pose}
                alt="Studly presenter delivering the lesson"
                width={768}
                height={1024}
                className="size-full object-cover object-top"
                style={{
                  transform: `translateY(${Math.sin(f / 34) * 2}px)`,
                  filter: blinking ? "brightness(0.94)" : undefined,
                }}
              />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-destructive/85 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-white">
                On air
              </span>
              {/* live waveform */}
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-0.5 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full bg-primary"
                    style={{ height: `${4 + Math.abs(Math.sin((f + i * 5) / 4)) * 10}px` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-2">
              <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-primary sm:text-xs">
                {PREVIEW_SLIDE.kicker}
              </p>
              <h2 className="font-display text-base font-semibold leading-tight sm:text-2xl">
                {PREVIEW_SLIDE.title}
              </h2>
              <ul className="space-y-1 text-[0.7rem] text-muted-foreground sm:text-sm">
                {PREVIEW_SLIDE.bullets.map((b, i) => (
                  <li
                    key={b}
                    style={{
                      opacity: i < revealed ? 1 : 0,
                      filter: i < revealed ? "blur(0px)" : "blur(10px)",
                      transform: `translateX(${i < revealed ? 0 : -8}px)`,
                      transition: "opacity .45s, filter .45s, transform .45s",
                    }}
                  >
                    • {b}
                  </li>
                ))}
              </ul>
              {revealed >= PREVIEW_SLIDE.bullets.length && (
                <p className="mt-1 inline-block w-fit rounded-xl bg-primary/15 p-2 text-[0.7rem] ring-1 ring-primary/30 sm:text-sm">
                  <span className="font-semibold text-foreground">Takeaway: </span>
                  <span className="text-muted-foreground">{PREVIEW_SLIDE.takeaway}</span>
                </p>
              )}
            </div>
          </div>

          {/* synced caption strip */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-2.5 pt-6">
            <p className="mx-auto max-w-md text-center text-[0.65rem] text-white/85 sm:text-xs">{caption}</p>
          </div>

          {/* play glyph */}
          <div className="absolute right-4 top-4 flex items-center gap-2 text-muted-foreground">
            {paused ? <Pause className="size-4" /> : <Play className="size-4" />}
          </div>
        </div>
        {/* faux scrub bar */}
        <div className="relative h-9 w-full bg-surface px-4">
          <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted/60">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
    </Floaty>
  );
}


/* ------------------------------------------------------------------ */
/* 2. Netflix-style cover shelves                                       */
/* ------------------------------------------------------------------ */

const SHELF = [
  { title: "Biology", subtitle: "Cells, energy & life", episodes: 8, hue: 150 },
  { title: "Mathematics", subtitle: "Algebra to calculus", episodes: 10, hue: 280 },
  { title: "History", subtitle: "Empires & revolutions", episodes: 7, hue: 30 },
  { title: "Chemistry", subtitle: "Reactions & matter", episodes: 6, hue: 200 },
  { title: "Physics", subtitle: "Forces & motion", episodes: 9, hue: 260 },
  { title: "Psychology", subtitle: "Mind & behaviour", episodes: 8, hue: 320 },
];

function CoverShelf() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
      <ScrollReveal>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Studly Originals</h2>
          <span className="text-sm text-muted-foreground">Trending this season</span>
        </div>
      </ScrollReveal>
      <ScrollReveal delay={0.1} className="mt-4">
        <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 [scrollbar-width:thin]">
          {SHELF.map((s) => (
            <div
              key={s.title}
              className="group lift relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border sm:w-48"
            >
              {/* gradient cover */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(155deg, oklch(0.5 0.14 ${s.hue}) 0%, oklch(0.3 0.1 ${s.hue}) 55%, oklch(0.18 0.03 ${s.hue}) 100%)`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-white/70">
                  S1 · {s.episodes} eps
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-white">{s.title}</h3>
                <p className="text-xs text-white/70">{s.subtitle}</p>
              </div>
              {/* hover play */}
              <div className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="grid size-12 place-items-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30">
                  <Play className="size-5 fill-white text-white" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3. How it works — 3-step zigzag                                      */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    n: 1,
    title: "Drop a topic",
    body: "Type a topic, paste your notes, or drop a PDF, slides, or a YouTube link. Studly reads it all.",
    icons: [Type, FileText, Link2],
    mock: (
      <div className="glass-card flex items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <Type className="size-4" />
        </div>
        <div className="flex-1 rounded-full bg-surface px-4 py-2 text-sm text-muted-foreground">
          Photosynthesis, for a 6th-grader…
        </div>
      </div>
    ),
  },
  {
    n: 2,
    title: "Cast your characters",
    body: "Name a tutor and add a reference photo. Studly draws its own illustrated version of them — pose set and all — so the likeness stays consistent without ever using your photo on screen.",
    icons: [Users],
    mock: (
      <div className="glass-card flex items-center gap-3 p-4">
        {[
          { name: "Dr. Mo", src: castMo.url },
          { name: "Lex", src: castLex.url },
          { name: "Iris", src: castIris.url },
        ].map((p) => (
          <div key={p.name} className="flex flex-col items-center gap-1">
            <div className="size-11 overflow-hidden rounded-full bg-primary/15 ring-1 ring-primary/30">
              <img src={p.src} alt={`${p.name}, a Studly cast reference photo`} loading="lazy" className="size-full object-cover" />
            </div>
            <span className="text-xs text-muted-foreground">{p.name}</span>
          </div>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">+ add</span>
      </div>
    ),
  },
  {
    n: 3,
    title: "Press play — it broadcasts itself",
    body: "Your cast broadcasts the lesson on a 24fps illustrated stage — talking, blinking, synced captions, pop-up quizzes. No slides to click. Then flashcards and Susu take over.",
    icons: [Clapperboard],
    mock: (
      <div className="relative mx-auto h-52 w-full max-w-sm sm:h-56">
        {[
          { label: "Episode 3", rot: -7, x: -26, y: 16, z: 10, hue: 200, scale: 0.9, blur: true },
          { label: "Episode 2", rot: 4, x: 18, y: 8, z: 20, hue: 320, scale: 0.95, blur: true },
          { label: "Episode 1", rot: -1, x: 0, y: -10, z: 30, hue: 300, scale: 1, blur: false },
        ].map((card) => (
          <div
            key={card.label}
            className="absolute inset-x-0 top-1/2 mx-auto aspect-[16/9] w-[88%] overflow-hidden rounded-2xl ring-1 ring-border shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
            style={{
              zIndex: card.z,
              transform: `translateY(calc(-50% + ${card.y}px)) translateX(${card.x}px) rotate(${card.rot}deg) scale(${card.scale})`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at 30% 30%, oklch(0.63 0.115 ${card.hue} / 0.35), transparent 60%), var(--color-surface-2)`,
                filter: card.blur ? "blur(1.5px) brightness(0.75)" : undefined,
              }}
            />
            {!card.blur && (
              <div className="relative flex h-full items-center justify-center">
                <span className="grid size-12 place-items-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30">
                  <Play className="size-5 fill-white text-white" />
                </span>
              </div>
            )}
            <p className="absolute bottom-3 left-3 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              {card.label}
            </p>
          </div>
        ))}
      </div>
    ),

  },
];

function HowItWorks() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
      <div aria-hidden className="hairline-grid pointer-events-none absolute inset-0 -z-10" />

      <div className="relative max-w-2xl">
        <MaskReveal from="left">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/30">
            The pipeline
          </span>
        </MaskReveal>
        <MaskReveal delay={0.08} className="mt-4">
          <h2 className="font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
            Notes in.
            <br />
            <span className="text-gradient">A whole season out.</span>
          </h2>
        </MaskReveal>
        <ScrollReveal delay={0.18} className="mt-4">
          <p className="max-w-md text-sm text-muted-foreground sm:text-base">
            No setup, no editing software. Three moves and your material is broadcasting itself.
          </p>
        </ScrollReveal>
      </div>

      <div className="relative mt-16 space-y-14 sm:space-y-24">
        {STEPS.map((step, i) => {
          const flip = i % 2 === 1;
          return (
            <div key={step.n} className="relative">
              {/* oversized ghost numeral sitting behind the row */}
              <span
                aria-hidden
                className="ghost-numeral absolute -top-10 z-0 text-[7rem] sm:-top-20 sm:text-[13rem]"
                style={flip ? { right: "-1.5rem" } : { left: "-1.5rem" }}
              >
                {step.n}
              </span>

              <div
                className={
                  "relative z-10 grid items-center gap-6 sm:grid-cols-12 sm:gap-4 " +
                  (flip ? "" : "")
                }
              >
                <MaskReveal
                  from={flip ? "right" : "left"}
                  className={
                    flip
                      ? "sm:col-span-5 sm:col-start-8 sm:order-2"
                      : "sm:col-span-5 sm:col-start-1"
                  }
                >
                  <div className="relative">
                    <div className="mb-3 flex items-center gap-2 text-primary">
                      {step.icons.map((Icon, k) => (
                        <span
                          key={k}
                          className="grid size-8 place-items-center rounded-xl bg-primary/12 ring-1 ring-primary/25"
                        >
                          <Icon className="size-4" />
                        </span>
                      ))}
                    </div>
                    <h3 className="font-display text-xl font-bold sm:text-2xl">{step.title}</h3>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </MaskReveal>

                {/* mock breaks out of its column and overlaps the copy edge */}
                <div
                  className={
                    flip
                      ? "sm:col-span-7 sm:col-start-1 sm:-mr-10 sm:order-1"
                      : "sm:col-span-7 sm:col-start-6 sm:-ml-10"
                  }
                >
                  <Parallax depth={i === 1 ? 34 : 22} rotate={flip ? -1.2 : 1.2}>
                    <MaskReveal delay={0.12}>
                      <div className="tile edge-bleed sheen-sweep grain relative p-4 sm:p-6">
                        <div
                          aria-hidden
                          className="animate-aurora pointer-events-none absolute -right-16 -top-20 size-64 rounded-full blur-3xl"
                          style={{
                            background:
                              "radial-gradient(circle, oklch(0.62 0.175 298 / 0.4), transparent 70%)",
                            animationDelay: `${i * -5}s`,
                          }}
                        />
                        <div className="relative z-[1]">{step.mock}</div>
                      </div>
                    </MaskReveal>
                  </Parallax>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 3b. Capability bento — dense, unequal tiles                         */
/* ------------------------------------------------------------------ */

const CAPABILITIES = [
  {
    icon: Clapperboard,
    title: "Episodes that play themselves",
    body: "A 24fps illustrated stage, synced captions, no slide clicking.",
    span: "sm:col-span-7 sm:row-span-2",
    big: true,
  },
  {
    icon: ListChecks,
    title: "Pop-up quizzes",
    body: "MCQ and written, live countdown, explanation on every miss.",
    span: "sm:col-span-5",
  },
  {
    icon: Layers,
    title: "Flashcards on tap",
    body: "Decks generated from the episode you just watched.",
    span: "sm:col-span-5",
  },
  {
    icon: BrainCircuit,
    title: "Susu, mid-lesson",
    body: "One tap from a wrong answer to a Socratic nudge.",
    span: "sm:col-span-4",
  },
  {
    icon: Trophy,
    title: "Leagues & XP",
    body: "Two-week seasons, six tiers, streaks that actually sting.",
    span: "sm:col-span-4",
  },
  {
    icon: Flame,
    title: "Streak engine",
    body: "Show up daily, keep the flame, bank the multiplier.",
    span: "sm:col-span-4",
  },
];

function CapabilityBento() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MaskReveal from="left">
          <h2 className="font-display text-2xl font-bold sm:text-4xl">Everything runs in one loop</h2>
        </MaskReveal>
        <ScrollReveal delay={0.1}>
          <p className="max-w-xs text-sm text-muted-foreground">
            Watch, get quizzed, get coached, get promoted. Nothing to stitch together.
          </p>
        </ScrollReveal>
      </div>

      <MaskRevealGroup className="mt-8 grid gap-4 sm:grid-cols-12" stagger={0.08}>
        {CAPABILITIES.map((c) => (
          <MaskItem key={c.title} className={c.span}>
            <div className="tile sheen-sweep grain group relative flex h-full flex-col justify-between overflow-hidden p-5 sm:p-6">
              <div
                aria-hidden
                className="animate-aurora pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full blur-3xl opacity-70"
                style={{ background: "radial-gradient(circle, oklch(0.62 0.175 298 / 0.32), transparent 70%)" }}
              />
              <span className="relative grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <c.icon className="size-5" />
              </span>
              <div className="relative mt-6">
                <h3
                  className={
                    "font-display font-bold " + (c.big ? "text-xl sm:text-3xl" : "text-base sm:text-lg")
                  }
                >
                  {c.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            </div>
          </MaskItem>
        ))}
      </MaskRevealGroup>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Susu spotlight                                                    */
/* ------------------------------------------------------------------ */

const SUSU_SAMPLE = `**Student:** Why does mitosis matter?\n\n**Susu:** Good question to sit with. Instead of the answer straight up — what would *go wrong* in a multicellular body if cells couldn't divide? Think **growth** and **repair**, then tell me which one breaks first.`;

function SusuSpotlight() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
      <div className="relative grid items-center gap-10 sm:grid-cols-12">
        {/* glowing aura panel the chat card overlaps */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-6 right-0 hidden w-[58%] rounded-[2.5rem] sm:block"
          style={{
            background:
              "linear-gradient(140deg, oklch(0.62 0.175 298 / 0.22), oklch(0.55 0.14 320 / 0.08) 55%, transparent)",
            border: "1px solid oklch(0.7 0.17 300 / 0.22)",
          }}
        />

        <MaskReveal from="left" className="relative z-10 sm:col-span-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary ring-1 ring-primary/30">
            <Sparkles className="size-3.5" /> Susu
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
            A tutor that coaches,
            <br />
            <span className="text-gradient">never cheats.</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Susu sits inside the chat like a study buddy who's read every episode. Ask mid-quiz and get a
            Socratic nudge, a mini-quiz, or a deck — never the answer on a plate.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
            {[
              "Hints that lead you to the \u201caha\u201d",
              "Generates flashcard decks on request",
              "Follows up straight from a wrong quiz answer",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {line}
              </li>
            ))}
          </ul>
        </MaskReveal>

        {/* card breaks its column, tilts, and overlaps the aura panel */}
        <div className="relative z-10 sm:col-span-7 sm:-ml-12">
          <Parallax depth={40} rotate={1.6}>
            <Floaty amount={7}>
              <MaskReveal delay={0.12}>
                <div className="glass-card edge-bleed grain glow-ring relative mx-auto max-w-md rotate-[-1.5deg] p-5 sm:rotate-[-2.5deg]">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <span className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                      <GraduationCap className="size-4" />
                    </span>
                    <span className="text-sm font-semibold">Susu</span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-success">
                      <span className="size-1.5 rounded-full bg-success" /> online
                    </span>
                  </div>
                  <div className="relative z-[1] pt-3 text-sm text-muted-foreground">
                    <Markdown content={SUSU_SAMPLE} />
                  </div>
                </div>
              </MaskReveal>
            </Floaty>
          </Parallax>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Leagues & trophies showcase                                       */
/* ------------------------------------------------------------------ */

function LeaguesShowcase() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
      <div className="grid gap-10 sm:grid-cols-12">
        <MaskReveal from="left" className="sm:col-span-5">
          <h2 className="font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
            Two-week seasons.
            <br />
            <span className="text-gradient">Promotion is the goal.</span>
          </h2>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Climb six tiers, keep your streak lit, and finish the season in the top three.
          </p>

          <ScrollReveal delay={0.15} className="mt-7 space-y-3">
            <div className="glass-card lift flex items-center gap-2 px-4 py-2.5">
              <Flame className="size-4 text-gold" />
              <span className="text-sm font-semibold">5-day streak</span>
            </div>
            <div className="glass-card lift flex items-center gap-3 px-4 py-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-gold/20 font-display text-xs font-bold text-gold ring-1 ring-gold/40">
                1
              </span>
              <span className="text-sm">
                <span className="font-semibold">adminns</span>{" "}
                <span className="text-muted-foreground">· 2,480 XP</span>
              </span>
            </div>
            <div className="glass-card lift ml-6 flex items-center gap-3 px-4 py-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-muted/50 font-display text-xs font-bold text-muted-foreground">
                2
              </span>
              <span className="text-sm text-muted-foreground">2,110 XP</span>
            </div>
          </ScrollReveal>
        </MaskReveal>

        {/* trophies scattered off-grid inside a tilted studio panel */}
        <div className="relative sm:col-span-7">
          <Parallax depth={30} rotate={-1.4}>
            <div className="tile grain relative overflow-hidden p-6 sm:p-8">
              <div
                aria-hidden
                className="animate-aurora pointer-events-none absolute -top-24 left-1/3 size-72 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, oklch(0.62 0.175 298 / 0.35), transparent 70%)" }}
              />
              <ScrollRevealGroup className="relative z-[1] grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-3">
                {LEAGUE_TIERS.map((tier, i) => {
                  const t = TROPHIES[tier]!;
                  const offsets = ["", "sm:translate-y-6", "sm:-translate-y-3", "sm:translate-y-4", "", "sm:translate-y-7"];
                  return (
                    <RevealItem key={tier} className={offsets[i % offsets.length] ?? ""}>
                      <Floaty amount={5} delay={i * 0.35}>
                        <div className="flex flex-col items-center gap-2">
                          <div
                            className="lift relative grid size-16 place-items-center rounded-2xl bg-surface-2 ring-1 ring-border sm:size-20"
                            style={{ boxShadow: `0 16px 46px -22px ${t.glow}` }}
                          >
                            <img
                              src={t.url}
                              alt={t.name}
                              loading="lazy"
                              className="size-12 object-contain sm:size-14"
                              style={{ filter: `drop-shadow(0 0 12px ${t.glow})` }}
                            />
                            {i === 0 && (
                              <span className="absolute -top-2 -right-2 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-bold text-primary-foreground">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground">{t.name}</span>
                        </div>
                      </Floaty>
                    </RevealItem>
                  );
                })}
              </ScrollRevealGroup>
            </div>
          </Parallax>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Final CTA                                                         */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section className="relative mx-auto w-full max-w-4xl px-5 py-24 sm:px-8">
      <ScrollReveal>
        <div className="glass-card glow-ring relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <Ambience density={10} intensity="soft" />
          <div className="relative">
            <StudlyLogo className="mx-auto h-10" />
            <h2 className="mt-6 font-display text-2xl font-bold sm:text-4xl">Start watching tonight.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Your first series is free. Drop a topic, press play, and let Susu handle the rest.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="cta-studio cta-sheen press h-12 rounded-full px-7 text-sm font-semibold">
                <Link to="/signup">Create your first series</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="press h-12 rounded-full px-7 text-sm font-semibold">
                <Link to="/login">I already study here</Link>
              </Button>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studly — Binge-worthy AI study series" },
      {
        name: "description",
        content:
          "Studly turns any topic, PDF or lecture into episodes, pop-up quizzes and flashcards, with Susu the AI tutor guiding you.",
      },
      { property: "og:title", content: "Studly — Binge-worthy AI study series" },
      {
        property: "og:description",
        content: "Turn any topic into episodes, quizzes and flashcards with Susu, your AI study coach.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="grain relative min-h-screen overflow-hidden">
      <Ambience density={20} />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/team" aria-label="About the team" className="press rounded-xl">
          <StudlyLogo className="h-9" />
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="press rounded-full text-sm font-semibold">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild className="press glow-ring rounded-full text-sm font-semibold">
            <Link to="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="relative mx-auto w-full max-w-3xl px-5 pt-16 pb-10 text-center sm:px-8 sm:pt-24">
        <ScrollReveal>
          <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
            <WordReveal text="Make studying hit different." accentFrom={2} delay={0.15} />
          </h1>
        </ScrollReveal>
        <RotatingSubtitle />
        <ScrollReveal delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="cta-studio cta-sheen press h-12 rounded-full px-7 text-sm font-semibold">
              <Link to="/signup">Create your first series</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="press h-12 rounded-full px-7 text-sm font-semibold">
              <Link to="/login">I already study here</Link>
            </Button>
          </div>
        </ScrollReveal>

        <HeroPreview />
      </section>

      <HowItWorks />
      <CapabilityBento />
      <SusuSpotlight />
      <LeaguesShowcase />
      <FinalCta />

      <footer className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-4 sm:px-8">
        <div className="flex flex-col items-center gap-2 border-t border-border pt-6 text-center">
          <Link to="/team" aria-label="About the team" className="press rounded-xl">
            <StudlyLogo className="h-7" />
          </Link>
          <p className="text-xs text-muted-foreground">The Netflix of studying. Built for the curious.</p>
        </div>
      </footer>
    </main>
  );
}
