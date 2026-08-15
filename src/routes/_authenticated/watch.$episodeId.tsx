import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Captions,
  CaptionsOff,
  Check,
  Flame,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Ambience } from "@/components/motion/Ambience";
import { PresenterStage, type PresenterFrames } from "@/components/player/PresenterStage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { estimateWordMs, mouthForWord, splitWords } from "@/lib/viseme";
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

type Slide = {
  id: string;
  order_index: number;
  title: string;
  bullets: unknown;
  takeaway: string | null;
  art_url?: string | null;
};

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
          .select("id, order_index, title, bullets, takeaway, art_url")
          .eq("episode_id", episodeId)
          .order("order_index", { ascending: true }),
        supabase
          .from("episode_questions")
          .select("id, order_index, prompt, options, correct_index, explanation, seconds, kind, answer_text")
          .eq("episode_id", episodeId)
          .order("order_index", { ascending: true }),
      ]);
      // The first cast member selected for the series is always the presenter. Never substitute a
      // different cast member simply because their generated art happened to finish first.
      let presenter: { name: string; frames: PresenterFrames } | null = null;
      if (episode?.series_id) {
        const [{ data: cast }, { data: art }] = await Promise.all([
          supabase
            .from("series_characters")
            .select("character_id, created_at, characters(name)")
            .eq("series_id", episode.series_id)
            .order("created_at", { ascending: true }),
          supabase.from("character_frames").select("character_id, kind, url").eq("series_id", episode.series_id),
        ]);
        const rows = (cast ?? []) as { character_id: string; created_at: string; characters: { name: string | null } | null }[];
        const chosen = rows[0];
        if (chosen) {
          const frames: PresenterFrames = {};
          for (const f of (art ?? []).filter((f) => f.character_id === chosen.character_id)) {
            frames[f.kind as keyof PresenterFrames] = f.url;
          }
          presenter = { name: chosen.characters?.name ?? "Presenter", frames };
        }
      }

      return { episode, slides: (slides ?? []) as Slide[], questions: (questions ?? []) as Question[], presenter };

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
      let at = Math.min(total - 1, Math.round(((i + 1) * total) / questions.length) - 1);
      // Never drop a question by overwriting a slot: shift it to the next free scene, then backwards.
      while (map.has(at) && at < total - 1) at += 1;
      while (map.has(at) && at > 0) at -= 1;
      if (!map.has(at)) map.set(at, q);
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

  /** Guards against double-crediting when the end of the runtime and the last quiz land together. */
  const finishing = useRef(false);

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    setFinished(true);
    pop("correct");
    const perfect = wrong === 0 && questions.length > 0;
    await saveProgress({ last_slide_index: Math.max(0, total - 1), completed: true, perfect_quiz: perfect });
    let gained = 0;
    const complete = await awardXp("episode_complete", XP.episodeComplete, `episode:${episodeId}`);
    gained += complete.awarded;
    setStreak(complete.current_streak);
    if (perfect) {
      const bonus = await awardXp("perfect_episode", XP.perfectEpisode, `perfect:${episodeId}`);
      gained += bonus.awarded;
    }
    setEarned((prev) => prev + gained);
    if (complete.awarded > 0 && user) {
      const { data: prof } = await supabase.from("profiles").select("episodes_completed").eq("id", user.id).maybeSingle();
      await supabase
        .from("profiles")
        .update({ episodes_completed: (prof?.episodes_completed ?? 0) + 1 })
        .eq("id", user.id);
    }
    await refreshProfile();
  }

  function advance() {
    if (total === 0 || quiz) return;
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
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("correct_answers").eq("id", user.id).maybeSingle();
        await supabase
          .from("profiles")
          .update({ correct_answers: (prof?.correct_answers ?? 0) + 1 })
          .eq("id", user.id);
        await refreshProfile();
      }
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
    <PlayerStage
      title={data?.episode?.title ?? "Episode"}
      presenter={data?.presenter ?? null}
      slides={slides}
      index={index}
      paused={Boolean(quiz)}
      onSeek={(i) => setIndex(i)}
      onEnded={advance}
      quiz={
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
      }
    />
  );
}

/** Runtime for a slide, so playback feels paced like a cut rather than a fixed slideshow. */
function slideDuration(slide: Slide | undefined) {
  if (!slide) return 6000;
  const bullets = asStrings(slide.bullets);
  const words = (slide.title + " " + bullets.join(" ") + " " + (slide.takeaway ?? "")).trim().split(/\s+/).length;
  return Math.min(26000, Math.max(6500, 2600 + words * 380));
}

/** Broadcast frame rate: 60fps, i.e. one frame every ~16.67ms. */
const FPS = 60;
const FRAME_MS = 1000 / FPS;

function formatTime(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayerStage({
  title,
  presenter,
  slides,
  index,
  paused,
  onSeek,
  onEnded,
  quiz,
}: {
  title: string;
  presenter: { name: string; frames: PresenterFrames } | null;
  slides: Slide[];
  index: number;
  paused: boolean;
  onSeek: (index: number) => void;
  onEnded: () => void;
  quiz: React.ReactNode;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const pendingElapsed = useRef<number | null>(null);
  /** True while the scene's script is still being read — the cut is held open until it finishes. */
  const narrating = useRef(true);

  const slide = slides[index];
  const durations = useMemo(() => slides.map(slideDuration), [slides]);
  const duration = durations[index] ?? 6000;
  const totalMs = durations.reduce((a, b) => a + b, 0);
  const before = durations.slice(0, index).reduce((a, b) => a + b, 0);
  const bullets = asStrings(slide?.bullets);

  /** Live playhead mirror, so the clock never reads stale state inside a frame callback. */
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  /** One scene can only ever end once, no matter how many signals arrive on the same frame. */
  const endedRef = useRef(false);
  const endScene = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnded();
  }, [onEnded]);

  // Reset the playhead whenever the cut changes (unless we scrubbed into it).
  useEffect(() => {
    const start = pendingElapsed.current ?? 0;
    pendingElapsed.current = null;
    elapsedRef.current = start;
    endedRef.current = false;
    setElapsed(start);
  }, [index]);

  /** Seek anywhere on the runtime, like dragging a video scrubber. */
  const seekToMs = useCallback(
    (ms: number) => {
      if (totalMs <= 0 || durations.length === 0) return;
      const clamped = Math.max(0, Math.min(totalMs - 1, ms));
      let acc = 0;
      for (let i = 0; i < durations.length; i += 1) {
        const d = durations[i]!;
        if (clamped < acc + d || i === durations.length - 1) {
          const within = Math.max(0, clamped - acc);
          if (i === index) {
            elapsedRef.current = within;
            endedRef.current = false;
            setElapsed(within);
          } else {
            pendingElapsed.current = within;
            onSeek(i);
          }
          return;
        }
        acc += d;
      }
    },
    [durations, index, onSeek, totalMs],
  );

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      seekToMs(((clientX - rect.left) / rect.width) * totalMs);
    },
    [seekToMs, totalMs],
  );

  const active = playing && !paused && !scrubbing && slides.length > 0;

  // Broadcast clock: the playhead only ever lands on whole 60fps frames (16.67ms),
  // so every text reveal, caption and camera move is quantised to the same frame grid.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      // A backgrounded tab can hand back a huge delta; clamp it so playback never jumps a scene.
      carry += Math.min(250, now - last) * rate;
      last = now;
      const steps = Math.floor(carry / FRAME_MS);
      if (steps > 0) {
        carry -= steps * FRAME_MS;
        const next = elapsedRef.current + steps * FRAME_MS;
        if (next >= duration) {
          elapsedRef.current = duration;
          setElapsed(duration);
          // Hold the cut open while the script is still being read so nothing gets clipped.
          if (!narrating.current) {
            endScene();
            return;
          }
        } else {
          elapsedRef.current = next;
          setElapsed(next);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, duration, endScene, rate]);

  /** Whole-frame playhead — the single source of truth for every synced overlay. */
  const frame = Math.floor(elapsed / FRAME_MS);
  const frameTime = frame * FRAME_MS;
  const globalFrame = Math.floor((before + elapsed) / FRAME_MS);
  const progress = duration ? Math.min(1, frameTime / duration) : 0;

  /** Camera move, evaluated per frame so it stays locked to the playhead (even when scrubbing). */
  const camera = useMemo(() => {
    const t = progress;
    const sway = Math.sin(globalFrame / (FPS * 2.6));
    const bob = Math.cos(globalFrame / (FPS * 3.4));
    return {
      transform: `scale(${(1 + 0.055 * t).toFixed(4)}) translate3d(${(sway * 0.5).toFixed(3)}%, ${(-1.1 * t + bob * 0.35).toFixed(3)}%, 0)`,
    };
  }, [globalFrame, progress]);

  // Reveal bullets in time with the voice-over pacing.
  const revealed = useMemo(() => {
    if (bullets.length === 0) return 0;
    const start = duration * 0.18;
    const per = (duration * 0.62) / bullets.length;
    return Math.min(bullets.length, Math.floor(Math.max(0, frameTime - start) / per) + 1);
  }, [bullets.length, duration, frameTime]);

  const showTakeaway = frameTime > duration * 0.72;

  /**
   * The whole scene script, spoken as one continuous take. Narration is keyed to the scene — never
   * to the caption — so changing captions can no longer cut the voice off mid-sentence.
   */
  const scriptLines = useMemo(() => {
    if (!slide) return [] as { text: string; start: number; end: number }[];
    const parts = [slide.title, ...bullets, slide.takeaway ?? ""].map((p) => p?.trim()).filter(Boolean) as string[];
    const out: { text: string; start: number; end: number }[] = [];
    let cursor = 0;
    for (const part of parts) {
      out.push({ text: part, start: cursor, end: cursor + part.length });
      cursor += part.length + 2; // joined with ". "
    }
    return out;
  }, [bullets, slide]);
  const script = useMemo(() => scriptLines.map((l) => l.text).join(". "), [scriptLines]);

  /** Character offset the voice has reached, so subtitles follow the words actually being read. */
  const [spokenChar, setSpokenChar] = useState(0);
  /** True once the full scene script has been read out — the cut cannot end before this. */
  const [narrationDone, setNarrationDone] = useState(false);
  narrating.current = Boolean(script) && !narrationDone;

  const spokenWord = useRef<{ text: string; start: number; dur: number } | null>(null);

  useEffect(() => {
    setSpokenChar(0);
    setNarrationDone(false);
  }, [script]);

  // The playhead can reach the end of the cut before the script finishes; once the last word is
  // read, move on immediately so nothing is ever cut off mid-sentence.
  useEffect(() => {
    if (!active || !narrationDone) return;
    if (elapsed >= duration - FRAME_MS) onEnded();
  }, [active, duration, elapsed, narrationDone, onEnded]);

  useEffect(() => {
    const synth = typeof window === "undefined" ? null : window.speechSynthesis;
    const speechRate = Math.min(2, 0.98 * rate);
    spokenWord.current = null;
    if (!active || !script) {
      synth?.cancel();
      setSpeaking(false);
      return;
    }

    // Muted: walk the whole script's words on an estimated clock so the mouth still matches text.
    if (!voiceOn || !synth) {
      setSpeaking(true);
      const words = splitWords(script);
      let i = 0;
      let timer = 0;
      const step = () => {
        const word = words[i];
        if (!word) {
          spokenWord.current = null;
          setNarrationDone(true);
          setSpeaking(false);
          return;
        }
        const dur = estimateWordMs(word.text, speechRate);
        spokenWord.current = { text: word.text, start: performance.now(), dur };
        setSpokenChar(word.index);
        i += 1;
        timer = window.setTimeout(step, dur + 40);
      };
      step();
      return () => {
        window.clearTimeout(timer);
        spokenWord.current = null;
      };
    }

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(script);
    utter.rate = speechRate;
    utter.pitch = 1.02;
    utter.onstart = () => setSpeaking(true);
    utter.onboundary = (event) => {
      if (event.name && event.name !== "word") return;
      const rest = script.slice(event.charIndex);
      const text = (event.charLength ? rest.slice(0, event.charLength) : rest.split(/\s/)[0]) ?? "";
      if (!text.trim()) return;
      spokenWord.current = { text, start: performance.now(), dur: estimateWordMs(text, speechRate) };
      setSpokenChar(event.charIndex);
    };
    utter.onend = () => {
      spokenWord.current = null;
      setSpeaking(false);
      setNarrationDone(true);
    };
    utter.onerror = () => {
      spokenWord.current = null;
      setSpeaking(false);
      setNarrationDone(true);
    };
    synth.speak(utter);
    return () => {
      synth.cancel();
      spokenWord.current = null;
      setSpeaking(false);
    };
  }, [active, script, rate, voiceOn]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  /** Subtitle line: the sentence being read, falling back to the playhead before speech starts. */
  const caption = useMemo(() => {
    if (!slide) return "";
    const spoken = scriptLines.find((l) => spokenChar >= l.start && spokenChar <= l.end);
    if (spoken) return spoken.text;
    if (frameTime < duration * 0.18) return slide.title;
    if (showTakeaway && slide.takeaway) return slide.takeaway;
    return bullets[Math.max(0, revealed - 1)] ?? slide.title;
  }, [bullets, duration, frameTime, revealed, scriptLines, showTakeaway, slide, spokenChar]);

  /** Mouth openness for the current frame, derived from the word actually being spoken. */
  const mouth = useMemo(() => {
    void globalFrame;
    const current = spokenWord.current;
    if (!active || !current) return 0;
    const p = (performance.now() - current.start) / current.dur;
    if (p < 0 || p > 1) return 0;
    return mouthForWord(current.text, p);
  }, [active, globalFrame]);



  const nudgeUi = useCallback(() => {
    setUiVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setUiVisible(false), 2800);
  }, []);

  useEffect(() => {
    nudgeUi();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [nudgeUi]);

  const toggleFullscreen = useCallback(async () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space" || e.key === "k") {
        e.preventDefault();
        setPlaying((p) => !p);
        nudgeUi();
      } else if (e.key === "ArrowRight") {
        onEnded();
        nudgeUi();
      } else if (e.key === "ArrowLeft") {
        onSeek(Math.max(0, index - 1));
        nudgeUi();
      } else if (e.key === "c") {
        setCaptionsOn((c) => !c);
        nudgeUi();
      } else if (e.key === "f") {
        void toggleFullscreen();

      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, nudgeUi, onEnded, onSeek, toggleFullscreen]);

  return (
    <div className={cn("relative mx-auto w-full max-w-5xl px-4 py-6 sm:px-8", fullscreen && "max-w-none px-0 py-0")}>
      {!fullscreen && (
        <div className="mb-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="press rounded-xl">
            <Link to="/episodes" aria-label="Leave episode">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">
              Scene {Math.min(index + 1, slides.length)} of {slides.length} · {formatTime(totalMs)} runtime
            </p>
          </div>
        </div>
      )}

      <div
        ref={shellRef}
        onMouseMove={nudgeUi}
        onClick={nudgeUi}
        className={cn(
          "group relative isolate aspect-video w-full overflow-hidden rounded-3xl border border-border/60 bg-[oklch(0.12_0.01_290)] shadow-glow-sm",
          fullscreen && "h-screen w-screen rounded-none border-0",
        )}
      >
        <Ambience intensity="bold" className="absolute inset-0" />

        {/* Generated scene backdrop is permanently below the presenter and lesson content. */}
        <AnimatePresence initial={false}>
          {slide?.art_url && (
            <motion.img
              key={slide.art_url}
              src={slide.art_url}
              alt=""
              aria-hidden
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 0.5, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
              style={{ transform: `scale(${(1.02 + 0.05 * progress).toFixed(4)})` }}
            />
          )}
        </AnimatePresence>
        {slide?.art_url && (
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,oklch(0.14_0.01_290/0.55),oklch(0.14_0.01_290/0.85))]" />
        )}



        <AnimatePresence initial={false}>
          <motion.section
            key={slide?.id ?? index}
            initial={{ opacity: 0, scale: 1.04, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.01, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-10 flex items-center gap-[4%] px-[5%] pb-[12%] pt-[5%]"
          >
            {/* Broadcast anchor: its own column, so it never sits on top of the lesson. */}
            <PresenterStage
              frames={presenter?.frames ?? {}}
              name={presenter?.name ?? "Presenter"}
              speaking={active}
              mouth={mouth}
              frame={globalFrame}
              className="aspect-[3/4] h-full max-h-[54%] w-[22%] shrink-0 self-end sm:max-h-[78%] sm:w-[26%] sm:self-center"
            />


            <div className="min-w-0 flex-1 origin-left will-change-transform" style={camera}>

              <p className="text-[clamp(0.6rem,1.1vw,0.8rem)] font-semibold uppercase tracking-[0.2em] text-primary">
                Scene {Math.min(index + 1, slides.length)}
              </p>
              <h1 className="mt-3 font-display text-[clamp(1.2rem,2.9vw,2.3rem)] font-bold leading-[1.1] tracking-tight">
                {slide?.title ?? "Loading…"}
              </h1>
              <ul className="mt-[3%] space-y-[1.6%]">
                {bullets.map((b, i) => (
                  <motion.li
                    key={b}
                    initial={false}
                    animate={i < revealed ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 14, filter: "blur(6px)" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex gap-3 text-[clamp(0.75rem,1.3vw,1rem)] leading-relaxed text-foreground/90"
                  >
                    <span className="mt-[0.7em] size-1.5 shrink-0 rounded-full bg-primary" />
                    {b}
                  </motion.li>
                ))}
              </ul>
              {slide?.takeaway && (
                <motion.p
                  initial={false}
                  animate={showTakeaway ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  transition={{ duration: 0.5 }}
                  className="mt-[3.5%] inline-block rounded-2xl border border-primary/25 bg-primary/10 p-[1.4%] px-4 text-[clamp(0.7rem,1.2vw,0.9rem)] font-medium text-primary"
                >
                  Takeaway · {slide.takeaway}
                </motion.p>
              )}
            </div>

          </motion.section>

        </AnimatePresence>


        {/* Captions */}
        {captionsOn && caption && (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 z-20 flex justify-center px-6 transition-all duration-300",
              uiVisible || !playing ? "bottom-24" : "bottom-10",
            )}
          >
            <p className="max-w-[80%] rounded-xl bg-black/65 px-3 py-1.5 text-center text-[clamp(0.75rem,1.3vw,1rem)] font-medium leading-snug text-white backdrop-blur-sm">
              {caption}
            </p>
          </div>
        )}

        {/* Controls */}
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300 sm:px-6",
            uiVisible || !playing ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Scrubbable timeline with chapter markers */}
          <div
            ref={barRef}
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(totalMs / 1000)}
            aria-valuenow={Math.round((before + elapsed) / 1000)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setScrubbing(true);
              seekFromPointer(e.clientX);
            }}
            onPointerMove={(e) => {
              if (scrubbing) seekFromPointer(e.clientX);
            }}
            onPointerUp={() => setScrubbing(false)}
            onPointerCancel={() => setScrubbing(false)}
            className="group/bar relative cursor-pointer touch-none py-2"
          >
            <div className="relative h-1.5 rounded-full bg-white/25 transition-all group-hover/bar:h-2.5">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                style={{ width: `${totalMs ? ((before + elapsed) / totalMs) * 100 : 0}%` }}
              />
              {/* chapter dividers */}
              {durations.slice(0, -1).map((_, i) => {
                const at = durations.slice(0, i + 1).reduce((a, b) => a + b, 0);
                return (
                  <span
                    key={i}
                    className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-background/70"
                    style={{ left: `${(at / totalMs) * 100}%` }}
                  />
                );
              })}
              <span
                className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
                style={{ left: `${totalMs ? ((before + elapsed) / totalMs) * 100 : 0}%`, opacity: scrubbing ? 1 : undefined }}
              />
            </div>
          </div>


          <div className="mt-2 flex items-center gap-2 text-white">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause" : "Play"}
              className="press grid size-10 place-items-center rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25"
            >
              {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => onSeek(Math.max(0, index - 1))}
              aria-label="Previous scene"
              className="press grid size-9 place-items-center rounded-full hover:bg-white/15"
            >
              <SkipBack className="size-4" />
            </button>
            <button
              type="button"
              onClick={onEnded}
              aria-label="Next scene"
              className="press grid size-9 place-items-center rounded-full hover:bg-white/15"
            >
              <SkipForward className="size-4" />
            </button>
            <span className="ml-1 text-xs tabular-nums text-white/80">
              {formatTime(before + elapsed)} / {formatTime(totalMs)}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCaptionsOn((c) => !c)}
                aria-pressed={captionsOn}
                aria-label={captionsOn ? "Turn captions off" : "Turn captions on"}
                className={cn(
                  "press grid size-9 place-items-center rounded-full hover:bg-white/15",
                  captionsOn && "bg-white/20 ring-1 ring-white/40",
                )}
              >
                {captionsOn ? <Captions className="size-4" /> : <CaptionsOff className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => setVoiceOn((v) => !v)}
                aria-pressed={voiceOn}
                aria-label={voiceOn ? "Mute the presenter" : "Unmute the presenter"}
                className={cn(
                  "press grid size-9 place-items-center rounded-full hover:bg-white/15",
                  voiceOn && "bg-white/20 ring-1 ring-white/40",
                )}
              >
                {voiceOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </button>



              <button
                type="button"
                onClick={() => setRate((r) => (r === 1 ? 1.5 : r === 1.5 ? 2 : r === 2 ? 0.75 : 1))}
                className="press rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold tabular-nums hover:bg-white/25"
                aria-label="Playback speed"
              >
                {rate}x
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label={fullscreen ? "Exit full screen" : "Full screen"}
                className="press grid size-9 place-items-center rounded-full hover:bg-white/15"
              >
                {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
            </span>
          </div>
        </div>

        {!playing && !paused && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play"
            className="absolute inset-0 z-10 grid place-items-center bg-background/25 backdrop-blur-[2px]"
          >
            <span className="grid size-16 place-items-center rounded-full bg-primary/90 text-primary-foreground shadow-glow-sm">
              <Play className="size-7" />
            </span>
          </button>
        )}

        {quiz}
      </div>

      {!fullscreen && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Space to play/pause · ← → to skip scenes · C for captions · F for full screen
        </p>
      )}
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
