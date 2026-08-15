/** Server-only helpers for generating presenter and scene artwork through the AI gateway. */

const MODEL = "google/gemini-3.1-flash-image";

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** Fetches an image URL and returns it as an inline data URL the image model can reference. */
export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > 8_000_000) return null;
    let binary = "";
    for (let i = 0; i < buf.length; i += 0x8000) {
      binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    }
    const mime = res.headers.get("content-type") ?? "image/png";
    return `data:${mime.split(";")[0]};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/**
 * Generates one image. Reference images are likeness/style anchors only — the returned
 * artwork is always newly generated, never the uploaded photo itself.
 */
export async function generateImage(prompt: string, references: string[] = []): Promise<Uint8Array | null> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;

  const content: Part[] = [{ type: "text", text: prompt }];
  for (const url of references.slice(0, 3)) content.push({ type: "image_url", image_url: { url } });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) return null;

  const body = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = body.data?.[0]?.b64_json;
  if (!b64) return null;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export const STYLE =
  "Stylised semi-realistic digital illustration, cinematic dark studio, deep charcoal backdrop, " +
  "soft muted violet rim light, gentle film grain, painterly but clean, no text, no words, no letters, no watermark.";

/** Pose prompts for the talking cycle. Each is generated against the master sheet so the face never drifts. */
export const POSES: { kind: string; prompt: string }[] = [
  {
    kind: "mouth_closed",
    prompt: "Same character, identical face, hair, outfit, pose and lighting. Lips gently closed, calm attentive expression, eyes open.",
  },
  {
    kind: "mouth_mid",
    prompt: "Same character, identical face, hair, outfit, pose and lighting. Mouth slightly open mid-sentence as if pronouncing 'eh', teeth barely visible, eyes open.",
  },
  {
    kind: "mouth_open",
    prompt: "Same character, identical face, hair, outfit, pose and lighting. Mouth clearly open in an 'ah' shape as if speaking a vowel, animated engaged expression, eyes open.",
  },
  {
    kind: "blink",
    prompt: "Same character, identical face, hair, outfit, pose and lighting. Eyes fully closed in a natural mid-blink, lips gently closed.",
  },
  {
    kind: "gesture",
    prompt: "Same character, identical face, hair, outfit and lighting. One hand raised in an explaining gesture, mouth slightly open, enthusiastic teaching energy.",
  },
];

/** Builds the master character sheet prompt for a cast member. */
export function masterPrompt(name: string, role: string | null | undefined, hasReference: boolean) {
  return [
    `Character design for an animated educational broadcast: ${name}, a warm, charismatic on-camera teacher.`,
    role ? `Role: ${role}.` : "",
    hasReference
      ? "Use the attached photo only as a likeness reference for face structure, hair and skin tone — do not copy or collage the photo, draw an original illustrated character inspired by it. Match the apparent age in the photo exactly: if they look young, keep them young. Smooth youthful skin, no wrinkles, no eye bags, no grey hair, no beard or stubble unless clearly present in the photo, no aging or maturing of the face."
      : "Invent an appealing original character design of a young adult teacher.",
    "Waist-up centred framing, facing the camera, tidy modern outfit, neutral closed-mouth expression, eyes open.",
    "Portrait 3:4 composition with generous headroom.",
    STYLE,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Prompt for a per-scene backdrop still. */
export function scenePrompt(topic: string, slideTitle: string) {
  return [
    `Cinematic 16:9 backdrop illustration for a lesson scene about "${slideTitle}" within the subject of ${topic}.`,
    "Atmospheric, symbolic imagery of the concept, no people, no faces, plenty of empty dark space on the right for captions.",
    STYLE,
  ].join(" ");
}
