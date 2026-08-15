import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUSU_SYSTEM = [
  "You are Susu, a warm, encouraging study coach inside the Studly learning app.",
  "Academic integrity is non-negotiable: never hand over finished graded work, essays, or full answer keys.",
  "Coach instead — give hints, ask Socratic questions, explain the underlying idea, and walk through a similar worked example.",
  "If a student asks you to just give the answer to graded work, kindly refuse and offer the next hint instead.",
  "Keep replies short and readable: a couple of sentences or a few tight bullets. No heavy markdown headings.",
].join(" ");

type AskInput = {
  question: string;
  context?: string;
  history?: { role: "user" | "assistant"; content: string }[];
};

export const askSusu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AskInput) => input)
  .handler(async ({ data }) => {
    const { chat } = await import("./ai.server");

    const reply = await chat([
      { role: "system", content: SUSU_SYSTEM },
      ...(data.context ? [{ role: "system" as const, content: `Lesson context:\n${data.context}` }] : []),
      ...(data.history ?? []).slice(-10),
      { role: "user", content: data.question },
    ]);

    let followUps: string[] = [];
    try {
      const { parseJson } = await import("./ai.server");
      const raw = await chat(
        [
          {
            role: "system",
            content:
              'Reply with JSON only: {"follow_ups":[string,string,string]} — three short questions the student could ask next.',
          },
          { role: "user", content: `Student asked: ${data.question}\nSusu answered: ${reply}` },
        ],
        { json: true },
      );
      followUps = parseJson<{ follow_ups?: string[] }>(raw).follow_ups?.slice(0, 3) ?? [];
    } catch {
      followUps = [];
    }

    return { reply, followUps };
  });
