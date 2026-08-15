import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Flame, Sparkles, Timer, Trophy, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Ambience } from "@/components/motion/Ambience";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { awardXp, pop, XP } from "@/lib/learning";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/watch/$episodeId")({
  head: () => ({
    meta: [
      { title: "Watch an episode — slides, takeaways and pop quizzes | Studly" },
      {
        name: "description",
        content: "Move through an episode slide by slide and answer timed pop-up quizzes to lock the ideas in.",
      },
      { property: "og:title", content: "Studly episode player" },
      { property: "og:description", content: "Bite-sized slides, timed pop quizzes and instant explanations." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

type Slide = { id: string; order_index: number; title: string; bullets: unknown; takeaway: string | null };
type Question = {
  id: string;
  order_index: number;
  prompt: string;
  options: unknown;
  correct_index: number | null;
  explanation: string;
  seconds: number;
  kind: string;
  answer_text: string | null;
};

/** Lenient grading for typed answers: case, spacing and trailing punctuation are ignored. */
export function gradeWritten(input: string, expected: string | null) {
  const norm = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(input);
  const b = norm(expected ?? "");
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function WatchPage() {
  const { episodeId } = Route.useParams();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [quiz, setQuiz] = useState<Question | null>(null);
  const [asked, setAsked] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);
  const [earned, setEarned] = useState(0);
  const [streak, setStreak] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: async () => {
      const [{ data: episode }, { data: slides }, { data: questions }] = await Promise.all([
        supabase.from("episodes").select("id, title, synopsis, series_id, order_index").eq("id", episodeId).maybeSingle(),
        supabase
          .from("episode_slides")
          .select("id, order_index, title, bullets, takeaway")
          .eq("episode_id", episodeId)
          .order("order_index", { ascending: true }),
        supabase
          .from("episode_questions")
          .select("id, order_index, prompt, options, correct_index, explanation, seconds, kind, answer_text")
          .eq("episode_id", episodeId)
          .order("order_index", { ascending: true }),
      ]);
      return { episode, slides: (slides ?? []) as Slide[], questions: (questions ?? []) as Question[] };
    },
  });

  const slides = data?.slides ?? [];
  const questions = data?.questions ?? [];
  const total = slides.length;
  const slide = slides[index];

  // Which slide each pop quiz interrupts: spread across the episode, last one at the end.
  const quizAt = useMemo(() => {
    const map = new Map<number, Question>();
    if (!total || questions.length === 0) return map;
    questions.forEach((q, i) => {
      const at = Math.min(total - 1, Math.round(((i + 1) * total) / questions.length) - 1);
      map.set(at, q);
    });
    return map;
  }, [questions, total]);

  const saveProgress = useCallback(
    async (payload: { last_slide_index: number; completed?: boolean; perfect_quiz?: boolean }) => {
      if (!user || !data?.episode) return;
      await supabase.from("progress").upsert(
        {
          user_id: user.id,
          series_id: data.episode.series_id,
          episode_id: episodeId,
          last_slide_index: payload.last_slide_index,
          completed: payload.completed ?? false,
          ...(payload.completed ? { completed_at: new Date().toISOString() } : {}),
          ...(payload.perfect_quiz === undefined ? {} : { perfect_quiz: payload.perfect_quiz }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,episode_id" },
      );
    },
    [data?.episode, episodeId, user],
  );

  useEffect(() => {
    if (slide) void saveProgress({ last_slide_index: index });
  }, [index, slide, saveProgress]);

  async function finish() {
    setFinished(true);
    pop("correct");
    const perfect = wrong === 0 && questions.length > 0;
    await saveProgress({ last_slide_index: total - 1, completed: true, perfect_quiz: perfect });
    let gained = 0;
    const complete = await awardXp("episode_complete", XP.episodeComplete, `episode:${episodeId}`);
    gained += complete.awarded;
    setStreak(complete.current_streak);
    if (perfect) {
      const bonus = await awardXp("perfect_episode", XP.perfectEpisode, `perfect:${episodeId}`);
      gained += bonus.awarded;
    }
    setEarned((prev) => prev + gained);
    if (complete.awarded > 0) {
      const { data: prof } = await supabase.from("profiles").select("episodes_completed").eq("id", user!.id).maybeSingle();
      await supabase
        .from("profiles")
        .update({ episodes_completed: (prof?.episodes_completed ?? 0) + 1 })
        .eq("id", user!.id);
    }
    await refreshProfile();
  }

  function advance() {
    const due = quizAt.get(index);
    if (due && !asked.includes(due.id)) {
      setAsked((prev) => [...prev, due.id]);
      setQuiz(due);
      pop("in");
      return;
    }
    if (index + 1 < total) setIndex(index + 1);
    else void finish();
  }

  async function handleAnswer(question: Question, answer: { index: number | null; text: string | null }, correct: boolean, ms: number) {
    const selected = answer.index;
    if (correct) {
      const res = await awardXp("quiz_correct", XP.correctAnswer, `q:${question.id}`);
      setEarned((prev) => prev + res.awarded);
      setStreak(res.current_streak);
      const { data: prof } = await supabase.from("profiles").select("correct_answers").eq("id", user!.id).maybeSingle();
      await supabase
        .from("profiles")
        .update({ correct_answers: (prof?.correct_answers ?? 0) + 1 })
        .eq("id", user!.id);
      await refreshProfile();
    } else {
      setWrong((prev) => prev + 1);
    }
    if (user) {
      await supabase.from("quiz_attempts").insert({
        user_id: user.id,
        episode_id: episodeId,
        question_id: question.id,
        question_text: question.prompt,
        selected_answer: answer.text ?? (selected === null ? null : asStrings(question.options)[selected] ?? null),
        is_correct: correct,
        time_taken_ms: ms,
        timed_out: selected === null && !answer.text,
      });
    }
  }

  if (finished) {
    return (
      <div className="relative grid min-h-screen place-items-center px-5 py-16">
        <Ambience intensity="bold" className="fixed" />
        <motion.div
          initial={{ opacity: 0, scale: 0.94, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/80 p-8 text-center backdrop-blur-xl"
        >
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Trophy className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">Episode complete</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {wrong === 0 && questions.length > 0 ? "Perfect quiz run — nothing slipped past you." : "Nice work. Review the misses and go again."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 font-semibold text-primary">
              <Sparkles className="size-4" /> +{earned} XP
            </span>
            {streak !== null && (
              <span className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 font-semibold text-accent-foreground">
                <Flame className="size-4" /> {streak} day streak
              </span>
            )}
          </div>
          <div className="mt-7 flex flex-col gap-2">
            <Button
              className="press h-11 rounded-2xl"
              onClick={() => navigate({ to: "/series/$seriesId", params: { seriesId: data!.episode!.series_id } })}
            >
              Next episode
            </Button>
            <Button asChild variant="ghost" className="press h-11 rounded-2xl">
              <Link to="/home">Back to dashboard</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="press rounded-xl">
          <Link to="/episodes" aria-label="Leave episode">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{data?.episode?.title ?? "Episode"}</p>
          <Progress value={total ? ((index + 1) / total) * 100 : 0} className="mt-2 h-1.5" />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {Math.min(index + 1, total)}/{total}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={slide?.id ?? index}
          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 rounded-3xl border border-border/60 bg-card/70 p-7 backdrop-blur-xl sm:p-10"
        >
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{slide?.title ?? "Loading…"}</h1>
          <ul className="mt-6 space-y-3">
            {asStrings(slide?.bullets).map((b) => (
              <li key={b} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {b}
              </li>
            ))}
          </ul>
          {slide?.takeaway && (
            <p className="mt-7 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm font-medium text-primary">
              Takeaway · {slide.takeaway}
            </p>
          )}
        </motion.section>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="ghost"
          className="press rounded-2xl"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Back
        </Button>
        <Button className="press glow-ring h-11 rounded-2xl px-6" onClick={advance}>
          {index + 1 < total ? "Next slide" : "Finish episode"}
          <ArrowRight className="ml-1.5 size-4" />
        </Button>
      </div>

      <AnimatePresence>
        {quiz && (
          <QuizPopup
            key={quiz.id}
            question={quiz}
            onDone={async (answer, correct, ms) => {
              await handleAnswer(quiz, answer, correct, ms);
            }}
            onClose={() => {
              setQuiz(null);
              if (index + 1 < total) setIndex((i) => i + 1);
              else void finish();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuizPopup({
  question,
  onDone,
  onClose,
}: {
  question: Question;
  onDone: (answer: { index: number | null; text: string | null }, correct: boolean, ms: number) => Promise<void>;
  onClose: () => void;
}) {
  const written = question.kind === "written";
  const options = asStrings(question.options);
  const [remaining, setRemaining] = useState(question.seconds);
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(false);
  const started = useRef(Date.now());

  const settle = useCallback(
    (answer: { index: number | null; text: string | null }) => {
      if (revealed) return;
      const isCorrect = written
        ? Boolean(answer.text) && gradeWritten(answer.text!, question.answer_text)
        : answer.index !== null && answer.index === question.correct_index;
      setSelected(answer.index);
      setSubmitted(answer.text);
      setCorrect(isCorrect);
      setRevealed(true);
      pop(isCorrect ? "correct" : "wrong");
      void onDone(answer, isCorrect, Date.now() - started.current);
    },
    [onDone, question.answer_text, question.correct_index, revealed, written],
  );

  useEffect(() => {
    if (revealed) return;
    const timer = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(timer);
          settle({ index: null, text: null });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [revealed, settle]);

  const pct = (remaining / question.seconds) * 100;
  const susuQuestion = `I got this quiz question wrong: "${question.prompt}". ${
    written ? `I answered "${submitted ?? "nothing"}".` : `I picked "${selected !== null ? options[selected] : "nothing"}".`
  } Can you help me understand it?`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-5 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className="w-full max-w-lg rounded-3xl border border-border/60 bg-card/90 p-6 shadow-glow-sm backdrop-blur-xl sm:p-8"
      >
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-primary">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> {written ? "Written pop quiz" : "Pop quiz"}
          </span>
          <span className={cn("flex items-center gap-1.5 tabular-nums", remaining <= 5 && !revealed && "text-destructive")}>
            <Timer className="size-3.5" /> {remaining}s
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear",
              remaining <= 5 && "bg-destructive",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <h2 className="mt-5 font-display text-xl font-semibold leading-snug">{question.prompt}</h2>

        {written ? (
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) settle({ index: null, text: typed.trim() });
            }}
          >
            <Input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={revealed}
              placeholder="Type your answer"
              className="h-11 rounded-2xl"
            />
            <Button type="submit" className="press h-11 shrink-0 rounded-2xl" disabled={revealed || !typed.trim()}>
              Submit
            </Button>
          </form>
        ) : (
          <div className="mt-5 space-y-2.5">
            {options.map((opt, i) => {
              const isCorrect = i === question.correct_index;
              const isPicked = i === selected;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={revealed}
                  onClick={() => settle({ index: i, text: opt })}
                  className={cn(
                    "press flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-left text-sm font-medium transition-colors",
                    !revealed && "hover:border-primary/50 hover:bg-primary/10",
                    revealed && isCorrect && "border-primary bg-primary/15 text-primary",
                    revealed && isPicked && !isCorrect && "border-destructive bg-destructive/15 text-destructive",
                  )}
                >
                  {opt}
                  {revealed && isCorrect && <Check className="size-4 shrink-0" />}
                  {revealed && isPicked && !isCorrect && <X className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-border/60 bg-background/50 p-4"
          >
            <p className="text-sm font-semibold">
              {correct
                ? `Correct · +${XP.correctAnswer} XP`
                : selected === null && !submitted
                  ? "Time's up"
                  : "Not quite"}
            </p>
            {written && !correct && question.answer_text && (
              <p className="mt-1.5 text-sm">
                The answer was <span className="font-semibold text-primary">{question.answer_text}</span>.
              </p>
            )}
            <p className="mt-1.5 text-sm text-muted-foreground">{question.explanation}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {!correct && (
                <Button asChild variant="outline" className="press h-10 flex-1 rounded-2xl">
                  <Link to="/chat" search={{ q: susuQuestion, ctx: `Question: ${question.prompt}\nCorrect answer explanation: ${question.explanation}` }}>
                    <Sparkles className="mr-1.5 size-4" /> Ask Susu
                  </Link>
                </Button>
              )}
              <Button className="press h-10 flex-1 rounded-2xl" onClick={onClose}>
                Keep watching
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
