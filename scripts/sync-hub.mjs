#!/usr/bin/env node
/**
 * Pull dragon metadata from https://dragonfire-hub.com/ into src/data/hub/.
 *
 * Usage: node scripts/sync-hub.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HUB = "https://dragonfire-hub.com";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/data/hub");

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "DragonfirePit/1.0 (fan catalog sync)" },
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

function extractJsonParse(chunk, needle) {
  const idx = chunk.indexOf(needle);
  if (idx < 0) return null;
  const start = chunk.indexOf("JSON.parse('", idx);
  if (start < 0) return null;
  let i = start + "JSON.parse('".length;
  let raw = "";
  while (i < chunk.length) {
    const c = chunk[i];
    if (c === "\\") {
      const n = chunk[i + 1];
      if (n === "n") raw += "\n";
      else if (n === "t") raw += "\t";
      else if (n === "r") raw += "\r";
      else if (n === "'" || n === '"' || n === "\\") raw += n;
      else if (n === "u") {
        raw += String.fromCharCode(parseInt(chunk.slice(i + 2, i + 6), 16));
        i += 6;
        continue;
      } else raw += n;
      i += 2;
      continue;
    }
    if (c === "'") break;
    raw += c;
    i += 1;
  }
  return JSON.parse(raw);
}

function extractObjectLiteral(chunk, startToken) {
  const start = chunk.indexOf(startToken);
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let j = start; j < chunk.length; j++) {
    const c = chunk[j];
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        end = j + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  return new Function(`return (${chunk.slice(start, end)});`)();
}

function cleanDragon(raw) {
  const habitsData = Array.isArray(raw.habitsData)
    ? raw.habitsData.map((h) => ({
        level1: h.level1 ?? "",
        level2: h.level2 ?? "",
        level3: h.level3 ?? "",
        level4: h.level4 ?? "",
        level5: h.level5 ?? "",
      }))
    : [];
  const habitsShortData = Array.isArray(raw.habitsShortData)
    ? raw.habitsShortData.map((h) => ({
        level1: h.level1 ?? "",
        level2: h.level2 ?? "",
        level3: h.level3 ?? "",
        level4: h.level4 ?? "",
        level5: h.level5 ?? "",
      }))
    : [];
  return {
    id: raw.id,
    name: raw.name,
    released: Boolean(raw.released),
    rarity: raw.rarity,
    type: raw.type,
    troopAffinity: raw.troopAffinity ?? [],
    stats: {
      strength: Number(raw.stats?.strength) || 0,
      instinct: Number(raw.stats?.instinct) || 0,
      intelligence: Number(raw.stats?.intelligence) || 0,
      initiative: Number(raw.stats?.initiative) || 0,
      marchSpeed: raw.stats?.marchSpeed ?? "",
    },
    vanguardSkill: raw.vanguardSkill ?? "",
    vanguardSkillShort: raw.vanguardSkillShort ?? "",
    buffVanguard: raw.buffVanguard ?? "",
    buffFlank: raw.buffFlank ?? "",
    buffFlankPosition: raw.buffFlankPosition ?? "",
    commandSkill: raw.commandSkill ?? "",
    commandSkillShort: raw.commandSkillShort ?? "",
    habitsData,
    habitsShortData,
    provides: raw.provides ?? { ability: [], boost: [] },
    needs: raw.needs ?? [],
  };
}

async function main() {
  console.log("Fetching", HUB);
  const html = await fetchText(HUB + "/");
  const chunks = [
    ...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g),
  ].map((m) => m[1]);
  if (chunks.length === 0) throw new Error("No script chunks found");

  let catalog = null;
  let statsByLevel = null;
  let troops = null;
  let starMultipliers = null;
  let power = null;

  for (const path of chunks) {
    const url = HUB + path;
    const body = await fetchText(url);
    if (!catalog && body.includes("vanguardSkillShort") && body.includes("JSON.parse('[{")) {
      catalog = extractJsonParse(body, "JSON.parse('[{");
    }
    if (!statsByLevel && body.includes('"50":{') && body.includes("JSON.parse('{\"")) {
      const parsed = extractJsonParse(body, "JSON.parse('{\"");
      if (parsed && parsed.caraxes?.["1"]?.strength) {
        statsByLevel = parsed;
      }
    }
    if (!power && body.includes("dragon_power")) {
      const obj = extractObjectLiteral(body, "{dragon_power");
      if (obj?.dragon_power) power = obj.dragon_power;
    }
    if (!troops && body.includes("basePerLevel")) {
      const obj = extractObjectLiteral(body, "{basePerLevel");
      if (obj?.basePerLevel) troops = obj;
    }
    if (!starMultipliers && body.includes("Star rank multipliers")) {
      const obj = extractObjectLiteral(
        body,
        '{description:"Star rank multipliers',
      );
      if (obj?.legendary) starMultipliers = obj;
    }
  }

  if (!catalog) throw new Error("Dragon catalog JSON not found");
  if (!statsByLevel) throw new Error("Stats-by-level JSON not found");
  if (!troops) throw new Error("Troop scaling table not found");
  if (!starMultipliers) throw new Error("Star multipliers not found");
  if (!power) throw new Error("Dragon power table not found");

  const cleaned = catalog.map(cleanDragon);
  const sourcedAt = new Date().toISOString();
  const meta = {
    source: HUB,
    sourcedAt,
    dragonCount: cleaned.length,
    releasedCount: cleaned.filter((d) => d.released).length,
  };

  await mkdir(OUT, { recursive: true });
  await writeFile(
    join(OUT, "catalog.json"),
    JSON.stringify({ meta, dragons: cleaned }, null, 2) + "\n",
  );
  await writeFile(
    join(OUT, "stats-by-level.json"),
    JSON.stringify(statsByLevel) + "\n",
  );
  await writeFile(
    join(OUT, "scaling.json"),
    JSON.stringify(
      {
        meta,
        troops,
        starStatMultipliers: starMultipliers,
        power,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(
    `Wrote ${cleaned.length} dragons (${meta.releasedCount} released) to src/data/hub/`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
