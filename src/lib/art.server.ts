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
  "Photorealistic studio portrait photography, natural human skin texture with realistic pores and subsurface detail, " +
  "cinematic dark studio, deep charcoal backdrop, soft muted violet rim light, 85mm lens, shallow depth of field, " +
  "true-to-life proportions, no cartoon or anime stylisation, no plastic or waxy skin, no text, no words, no letters, no watermark.";

/** Pose prompts for the talking cycle. Each is generated against the master sheet so the face never drifts. */
export const POSES: { kind: string; prompt: string }[] = [
  {
    kind: "mouth_closed",
    prompt: "Same person, identical face, age, hair, outfit, pose and lighting. Lips gently closed, calm attentive expression, eyes open.",
  },
  {
    kind: "mouth_mid",
    prompt:
      "Same person, identical face, age, hair, outfit, pose and lighting. Lips parted just a little mid-sentence, a natural conversational speaking shape, jaw barely lowered, eyes open.",
  },
  {
    kind: "mouth_open",
    prompt:
      "Same person, identical face, age, hair, outfit, pose and lighting. Mouth open in a natural relaxed speaking vowel, jaw only slightly lowered as in normal conversation — not a wide yawn, not shouting, not chewing. Eyes open.",
  },
  {
    kind: "blink",
    prompt: "Same person, identical face, age, hair, outfit, pose and lighting. Eyes fully closed in a natural mid-blink, lips gently closed.",
  },
  {
    kind: "gesture",
    prompt: "Same person, identical face, age, hair, outfit and lighting. One hand raised in an explaining gesture, lips slightly parted, engaged teaching energy.",
  },
];

/** Builds the master character sheet prompt for a cast member. */
export function masterPrompt(name: string, role: string | null | undefined, hasReference: boolean) {
  return [
    `Photorealistic portrait of an on-camera teacher for an educational broadcast: ${name}, warm and charismatic.`,
    role ? `Role: ${role}.` : "",
    hasReference
      ? "Use the attached photo as the likeness reference for face structure, features, hair, skin tone and body type — recreate the same person as a realistic studio photograph rather than copying or collaging the source pixels. " +
        "Estimate their age from the photo and reproduce it exactly: do not age them up, do not youthify them, keep the same facial maturity, hairline, facial hair and skin condition as in the reference — no added wrinkles, eye bags, grey hair or stubble, and no smoothing away features they actually have."
      : "Create a realistic portrait of an original young adult teacher.",
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
