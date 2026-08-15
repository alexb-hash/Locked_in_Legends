import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle, Sparkles } from "lucide-react";

import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/episodes")({
  head: () => ({
    meta: [
      { title: "Episodes — binge your way through any subject | Studly" },
      {
        name: "description",
        content: "Browse Studly series and watch bite-sized episodes with pop-up quizzes that keep you honest.",
      },
      { property: "og:title", content: "Studly episodes" },
      { property: "og:description", content: "Netflix-style study series with slides, takeaways and pop quizzes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EpisodesPage,
});

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  topic: string | null;
  cover_gradient: string | null;
  episode_count: number;
};

function EpisodesPage() {
  const { user } = useAuth();

  const { data: series, isLoading } = useQuery({
    queryKey: ["series-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, description, subject, topic, cover_gradient, episode_count")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SeriesRow[];
    },
  });

  const { data: progress } = useQuery({
    queryKey: ["progress-all", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress")
        .select("series_id, episode_id, completed")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const doneBySeries = new Map<string, number>();
  for (const row of progress ?? []) {
    if (row.completed && row.series_id) doneBySeries.set(row.series_id, (doneBySeries.get(row.series_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <Reveal>
        <p className="text-sm font-medium text-muted-foreground">Your library</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Pick a <span className="text-gradient">series</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Each episode is a handful of slides and a pop-up quiz. Finish one and your streak stays alive.
        </p>
      </Reveal>

      {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading your shelves…</p>}

      <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(series ?? []).map((s) => {
          const done = doneBySeries.get(s.id) ?? 0;
          const pct = s.episode_count ? Math.round((done / s.episode_count) * 100) : 0;
          return (
            <RevealItem key={s.id}>
              <Link
                to="/series/$seriesId"
                params={{ seriesId: s.id }}
                className="press group block h-full overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl transition-shadow hover:shadow-glow-sm"
              >
                <div
                  className={cn(
                    "relative flex h-36 items-end bg-gradient-to-br p-4",
                    s.cover_gradient ?? "from-primary/40 to-accent/20",
                  )}
                >
                  <span className="absolute right-4 top-4 rounded-full bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                    {s.subject ?? "Studly"}
                  </span>
                  <PlayCircle className="size-9 text-foreground/85 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="space-y-3 p-5">
                  <h2 className="font-display text-lg font-semibold leading-snug">{s.title}</h2>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  <div className="space-y-1.5">
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-xs text-muted-foreground">
                      {done}/{s.episode_count} episodes · {pct}%
                    </p>
                  </div>
                </div>
              </Link>
            </RevealItem>
          );
        })}
      </RevealGroup>

      {!isLoading && (series ?? []).length === 0 && (
        <div className="mt-12 rounded-3xl border border-border/60 bg-card/60 p-10 text-center">
          <Sparkles className="mx-auto size-6 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">No series yet — creating your own lands in a later phase.</p>
        </div>
      )}
    </div>
  );
}
