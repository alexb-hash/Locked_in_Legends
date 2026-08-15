import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Crown, Sparkles } from "lucide-react";

import { Ambience } from "@/components/motion/Ambience";
import { ScrollReveal } from "@/components/motion/Reveal";
import { StudlyLogo } from "@/components/brand/StudlyLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Locked In Legends — Studly" },
      {
        name: "description",
        content:
          "The creators behind Studly: Alex Baker, Namneung Shulim, and Focus Saithong — Team Locked In Legends.",
      },
      { property: "og:title", content: "Team Locked In Legends — Studly" },
      {
        property: "og:description",
        content:
          "Meet the three minds behind Studly: Alex Baker, Namneung Shulim, and Focus Saithong.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TeamPage,
});

type Member = {
  name: string;
  initials: string;
  role: string;
  bio: string;
  accent: string;
};

const TEAM: Member[] = [
  {
    name: "Alex Baker",
    initials: "AB",
    role: "Founder & Product",
    accent: "from-violet-500/30 to-fuchsia-500/20",
    bio: "Dreams up the Studly universe — from the cinematic episode player to the leagues that keep students coming back. Obsessed with making learning feel like a show you can't pause.",
  },
  {
    name: "Namneung Shulim",
    initials: "NS",
    role: "Engineering & AI",
    accent: "from-sky-500/30 to-indigo-500/20",
    bio: "Architects the engine under the hood: the 24fps broadcast renderer, the Susu AI tutor, and the generation pipeline that turns a topic into a full animated series.",
  },
  {
    name: "Focus Saithong",
    initials: "FS",
    role: "Design & Motion",
    accent: "from-emerald-500/30 to-teal-500/20",
    bio: "Shapes every pixel of the dreamy interface — the glass-morphism, the ambient motion, and the dreamlike feel that makes Studly look like nothing else.",
  },
];

function TeamPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Ambience density={20} />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" aria-label="Back to Studly home">
          <StudlyLogo className="h-9" />
        </Link>
        <Button asChild variant="ghost" className="press rounded-full text-sm font-semibold">
          <Link to="/">
            <ArrowLeft className="mr-1 size-4" />
            Back home
          </Link>
        </Button>
      </header>

      <section className="relative mx-auto w-full max-w-3xl px-5 pt-12 pb-8 text-center sm:px-8 sm:pt-16">
        <ScrollReveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Crown className="size-3.5" />
            Team Locked In Legends
          </span>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <h1 className="mt-5 font-sans text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            The minds behind <span className="text-gradient">Studly</span>
          </h1>
        </ScrollReveal>
        <ScrollReveal delay={0.16}>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Three students who refused to let studying stay boring. Together they built the
            Netflix of studying — animated lessons, an AI tutor named Susu, and leagues that make
            learning a sport.
          </p>
        </ScrollReveal>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-5 pb-16 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member, i) => (
            <ScrollReveal key={member.name} delay={0.08 * i}>
              <article className="group relative overflow-hidden rounded-3xl border border-border bg-surface/60 p-6 backdrop-blur-xl transition-colors hover:border-primary/40">
                <div
                  className={`pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-gradient-to-br ${member.accent} blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                />
                <div className="relative flex flex-col items-center text-center">
                  <div className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 ring-1 ring-primary/30">
                    <span className="font-display text-2xl font-bold text-primary">
                      {member.initials}
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-lg font-bold">{member.name}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {member.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface/40 p-8 text-center backdrop-blur-xl">
            <motion.span
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="size-5 text-primary" />
            </motion.span>
            <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
              Studly was built from late nights, shared notes, and a belief that learning should feel
              like a show you can't pause. That's the legend — and it's still being written.
            </p>
            <Button asChild className="cta-studio cta-sheen press mt-2 rounded-full px-6 text-sm font-semibold">
              <Link to="/signup">Start studying with us</Link>
            </Button>
          </div>
        </ScrollReveal>
      </section>

      <footer className="relative mx-auto w-full max-w-6xl px-5 pb-10 pt-4 sm:px-8">
        <div className="flex flex-col items-center gap-2 border-t border-border pt-6 text-center">
          <StudlyLogo className="h-7" />
          <p className="text-xs text-muted-foreground">
            Team Locked In Legends. The Netflix of studying.
          </p>
        </div>
      </footer>
    </main>
  );
}
