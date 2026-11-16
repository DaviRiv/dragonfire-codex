/**
 * Captures the main routes at phone and desktop widths against a seeded pit,
 * so a layout change can be looked at rather than guessed about.
 *
 *   node scripts/ui-shots.mjs [outDir] [baseUrl]
 *
 * Needs a running dev server. Writes <outDir>/<route>-<width>.png.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "/tmp/ui-shots";
const BASE = process.argv[3] ?? "http://127.0.0.1:43123";
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const DESKTOP = { width: 1440, height: 950, deviceScaleFactor: 1 };

const now = new Date().toISOString();
/** A pit with stars, two saved lines and a war kit, so nothing is an empty state. */
const SEED = {
  version: 2,
  owned: [
    ["vhagar", 2],
    ["rhysarion", 7],
    ["venator", 6],
    ["malachite", 5],
    ["caraxes", 4],
    ["syrax", 3],
    ["velar", 4],
    ["daemoros", 6],
    ["vaeldra", 2],
    ["crimson-shade", 5],
  ].map(([dragonId, starRank], i) => ({
    id: `own-${i}`,
    dragonId,
    starRank,
    reignLevel: 30 + i,
    notes: "",
    habits: [],
    habitRanks: [],
  })),
  customDragons: [],
  lineups: [
    {
      id: "lin-1",
      name: "PvP wall",
      kind: "pit",
      mode: "pvp",
      troop: "spearmen",
      notes: "Hold the tile, Vhagar soaks.",
      slots: {
        left: { dragonId: "malachite", starRank: 5, reignLevel: 40 },
        vanguard: { dragonId: "vhagar", starRank: 2, reignLevel: 36 },
        right: { dragonId: "venator", starRank: 6, reignLevel: 38 },
      },
      ignoreLevel: false,
      craftStars: 0,
      updatedAt: now,
    },
    {
      id: "lin-2",
      name: "Rally core",
      kind: "theory",
      mode: "rally",
      troop: "cavalry",
      notes: "",
      slots: {
        left: { dragonId: "rhysarion", starRank: 7, reignLevel: 50 },
        vanguard: { dragonId: "caraxes", starRank: 4, reignLevel: 30 },
        right: null,
      },
      ignoreLevel: false,
      craftStars: 0,
      updatedAt: now,
    },
  ],
  teams: [
    {
      id: "tm-1",
      name: "Alliance war kit",
      description: "Tile push week.",
      lineupIds: ["lin-1"],
      updatedAt: now,
    },
  ],
};

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

/** Seats three dragons so the Left/Vanguard/Right bar shows its filled state. */
async function fillSeats(page) {
  for (const label of ["Pick Left", "Pick Vanguard", "Pick Right"]) {
    const found = await page.evaluate((l) => {
      const btn = document.querySelector(`button[aria-label="${l}"]`);
      btn?.click();
      return !!btn;
    }, label);
    if (!found) continue;
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    await page.evaluate(() => {
      document.querySelector("li button, [role='option']")?.click();
    });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
  }
}

for (const [route, seats] of [
  ["/pit", false],
  ["/team", true],
  ["/counter", true],
  ["/lineups", false],
  ["/lineups/lin-1", false],
  ["/teams", false],
  ["/guide", false],
  ["/talk", false],
]) {
  for (const [sizeName, viewport] of [
    ["390", PHONE],
    ["1440", DESKTOP],
  ]) {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.evaluateOnNewDocument((seed) => {
      localStorage.setItem("dragonfire-pit.tutorial.v1", "1");
      localStorage.setItem("dragonfire-pit.v1", JSON.stringify(seed));
    }, SEED);
    await page.goto(`${BASE}${route}`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
    if (seats) await fillSeats(page);
    const name = `${route.replace(/\//g, "-").replace(/^-/, "") || "home"}-${sizeName}`;
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.close();
    console.log(name);
  }
}

await browser.close();
console.log(`\nWrote to ${OUT}`);
