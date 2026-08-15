/**
 * Word-accurate viseme shaping.
 *
 * Speech synthesis reports word boundaries, not phonemes, so the mouth is driven by walking the
 * letters of the word that is currently being spoken and interpolating between per-letter mouth
 * openings. That keeps articulation locked to the actual words instead of a generic chewing loop.
 */

/**
 * Mouth opening (0 = closed, 1 = wide) for a single letter.
 *
 * Values stay inside a conversational band: real speech barely drops the jaw, so even open vowels
 * top out well below a wide yawn. This is what keeps articulation reading as talking, not chewing.
 */
function letterAperture(ch: string): number {
  switch (ch) {
    case "a":
      return 0.62;
    case "o":
      return 0.54;
    case "e":
      return 0.44;
    case "u":
      return 0.38;
    case "i":
    case "y":
      return 0.32;
    case "m":
    case "b":
    case "p":
      return 0.06;
    case "f":
    case "v":
    case "w":
      return 0.16;
    case "l":
    case "n":
    case "d":
    case "t":
    case "s":
    case "z":
    case "c":
      return 0.22;
    default:
      return 0.26;
  }
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Vowels carry the syllable, so only they get to peak; consonants just brush past. */
const isVowel = (ch: string) => "aeiouy".includes(ch);

/**
 * Openness for `word` at normalised progress `p` (0..1). The word is reduced to its syllable
 * nuclei (vowel clusters) with the surrounding consonants acting as closures, then interpolated
 * with soft attack and release so consecutive words never click.
 */
export function mouthForWord(word: string, p: number): number {
  const letters = word.toLowerCase().replace(/[^a-z]/g, "").split("");
  if (letters.length === 0) return 0;

  // Collapse vowel runs into one aperture so "eee" is one opening rather than three chews.
  const apertures: number[] = [];
  for (let i = 0; i < letters.length; i += 1) {
    const ch = letters[i]!;
    const value = letterAperture(ch);
    const prev = letters[i - 1];
    if (prev && isVowel(prev) && isVowel(ch)) {
      apertures[apertures.length - 1] = Math.max(apertures[apertures.length - 1] ?? 0, value);
      continue;
    }
    apertures.push(value);
  }

  const clamped = Math.max(0, Math.min(1, p));
  const pos = clamped * (apertures.length - 1 || 1);
  const i = Math.floor(pos);
  const frac = smooth(pos - i);
  const a = apertures[Math.min(i, apertures.length - 1)] ?? 0;
  const b = apertures[Math.min(i + 1, apertures.length - 1)] ?? a;
  const value = a + (b - a) * frac;

  // Fade in/out over the word edges so the jaw settles between words.
  const edge = Math.min(1, Math.min(clamped, 1 - clamped) / 0.18);
  return value * smooth(Math.max(0, edge));
}

/** Rough spoken duration in ms for a word at a given speech rate. */
export function estimateWordMs(word: string, rate = 1): number {
  const letters = word.replace(/[^A-Za-z]/g, "").length || 1;
  return Math.max(140, Math.min(900, 90 + letters * 62)) / Math.max(0.5, rate);
}

/** Splits a line into spoken words with their character offsets. */
export function splitWords(line: string): { text: string; index: number }[] {
  const out: { text: string; index: number }[] = [];
  const re = /[^\s]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push({ text: m[0], index: m.index });
  return out;
}
