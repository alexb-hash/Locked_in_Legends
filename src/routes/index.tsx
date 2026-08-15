import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Layers, PlayCircle, Sparkles, Target, Trophy, Wand2 } from "lucide-react";

import { Ambience } from "@/components/motion/Ambience";
import { Floaty, Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";

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
    <div className="relative mx-auto mt-4 h-[1.2em] max-w-xl">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, filter: "blur(14px)", y: 8 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          exit={{ opacity: 0, filter: "blur(14px)", y: -8 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-2xl font-light tracking-tight text-muted-foreground sm:text-3xl"
        >
          {ROTATING_SUBTITLES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

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

const FEATURES = [
  { icon: PlayCircle, title: "Netflix-style episodes", body: "Your syllabus becomes a season you actually finish." },
  { icon: Target, title: "Pop-up quizzes", body: "Timed questions mid-episode with instant explanations." },
  { icon: Layers, title: "AI flashcards", body: "Decks generated from your own notes and slides." },
  { icon: Sparkles, title: "Susu, your tutor", body: "Socratic hints that coach you instead of doing the work." },
  { icon: Trophy, title: "Leagues & streaks", body: "Two-week seasons, trophies and a fire you won't want to lose." },
  { icon: Wand2, title: "Create from anything", body: "Topic, PDF, slides, video or a paste of your notes." },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Ambience density={20} />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Sparkles className="size-5" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-gradient">Studly</span>
        </span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="press rounded-full text-sm font-semibold">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild className="press glow-ring rounded-full text-sm font-semibold">
            <Link to="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="relative mx-auto w-full max-w-4xl px-5 pt-16 pb-10 text-center sm:px-8 sm:pt-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            Your AI study platform
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Study that feels like <span className="text-gradient">bingeing a show</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Drop in a topic, a PDF or a lecture recording. Studly turns it into episodes, pop quizzes and flashcards —
            and Susu coaches you through every tricky bit.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="press glow-ring h-12 rounded-full px-7 text-sm font-semibold">
              <Link to="/signup">Create your first series</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="press h-12 rounded-full px-7 text-sm font-semibold">
              <Link to="/login">I already study here</Link>
            </Button>
          </div>
        </Reveal>

        <Floaty className="mt-16" amount={10}>
          <div className="glass-card glow-ring mx-auto max-w-2xl p-6 text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Episode 3</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Why cells need mitochondria</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• ATP is the cell's spendable energy currency</li>
              <li>• The inner membrane's folds multiply surface area</li>
              <li>• More energy demand means more mitochondria</li>
            </ul>
            <p className="mt-5 rounded-xl bg-surface-2 p-4 text-sm">
              <span className="font-semibold text-foreground">Takeaway: </span>
              <span className="text-muted-foreground">Structure follows the energy bill.</span>
            </p>
          </div>
        </Floaty>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <RevealItem key={feature.title}>
              <div className="glass-card lift h-full p-6">
                <feature.icon className="size-5 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
    </main>
  );
}
