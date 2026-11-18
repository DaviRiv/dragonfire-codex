const TIMING_CORE = String.raw`(?:Odd|Even)(?:-numbered)?\s+[Rr]ounds?`;
const TRAILING_TIMING = new RegExp(
  String.raw`^(.*)\s*\(\s*(${TIMING_CORE})\s*\)\s*$`,
  "i",
);
const LEADING_TIMING = new RegExp(
  String.raw`^(${TIMING_CORE})\s*:\s*(.*)$`,
  "i",
);
const MID_TIMING = new RegExp(
  String.raw`(?<!Start of)(?<![.!?])\s+(${TIMING_CORE}\s*:)`,
  "gi",
);

function timingLabel(raw: string): string {
  const even = /^even/i.test(raw.trim());
  const numbered = /-numbered/i.test(raw);
  const plural = /rounds$/i.test(raw.trim());
  const kind = even ? "Even" : "Odd";
  if (!numbered) return `${kind}-numbered Rounds`;
  return `${kind}-numbered ${plural ? "Rounds" : "Round"}`;
}

function formatChunk(chunk: string): string {
  const trimmed = chunk.replace(/\s+/g, " ").trim();
  if (!trimmed) return trimmed;
  const trailing = trimmed.match(TRAILING_TIMING);
  if (trailing && trailing[1].trim()) {
    return `${timingLabel(trailing[2])}: ${trailing[1].trim()}`;
  }
  const leading = trimmed.match(LEADING_TIMING);
  if (leading) {
    return `${timingLabel(leading[1])}: ${leading[2].trim()}`;
  }
  return trimmed;
}

function startsTimingSentence(chunk: string): boolean {
  return /^(?:Odd|Even)-numbered Rounds?:/i.test(chunk);
}

/**
 * Odd-numbered / Even-numbered round clauses always begin a sentence
 * in habit and command copy. Hub shorts often bury that timing in a
 * trailing "(Odd Rounds)" or after a pipe.
 */
const FORMATTED_TIMING = new Map<string, string>();
const FORMAT_CACHE_MAX = 4096;

export function formatRoundTimingSentences(text: string): string {
  const raw = text.replace(/\s+/g, " ").trim();
  if (!raw) return raw;
  const hit = FORMATTED_TIMING.get(raw);
  if (hit !== undefined) return hit;
  const pieces = raw.split(/\s*\|\s*/).map(formatChunk);
  let next = pieces[0] ?? "";
  for (let i = 1; i < pieces.length; i++) {
    const piece = pieces[i];
    if (!piece) continue;
    if (startsTimingSentence(piece)) {
      next = `${next.replace(/[. ]+$/, "")}. ${piece}`;
    } else {
      next = `${next} | ${piece}`;
    }
  }
  next = next.replace(MID_TIMING, (_, label: string) => {
    const name = String(label).replace(/:\s*$/, "").trim();
    return `. ${timingLabel(name)}:`;
  });
  const out = next.replace(/\.\s*\./g, ".").trim();
  if (FORMATTED_TIMING.size >= FORMAT_CACHE_MAX) FORMATTED_TIMING.clear();
  FORMATTED_TIMING.set(raw, out);
  return out;
}
