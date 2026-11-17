/**
 * Measures the layout defects this redesign is meant to remove, so a
 * regression shows up as a failing assertion rather than a screenshot nobody
 * compares. Run against a dev server: node scripts/ui-check.mjs [baseUrl]
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:43123";
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };

const failures = [];
const notes = [];

function check(name, ok, detail) {
  if (ok) {
    notes.push(`  ok   ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failures.push(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

/*
 * Every fresh profile gets the first-visit tutorial, which covers the page and
 * swallows clicks. Marking it seen before the app boots measures the app.
 */
async function open(path, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("dragonfire-pit.tutorial.v1", "1");
  });
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
  return page;
}

/** Document wider than the viewport means the page scrolls sideways. */
async function horizontalOverflow(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const viewWidth = window.innerWidth;
    if (docWidth <= viewWidth + 1) return null;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const box = el.getBoundingClientRect();
      if (box.width > viewWidth + 1) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} = ${Math.round(box.width)}px`,
        );
      }
    }
    return { docWidth, viewWidth, offenders: offenders.slice(0, 4) };
  });
}

// ---------------------------------------------------------------- /pit layout
{
  const page = await open("/pit", PHONE);
  const grid = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('button[aria-label$=" kit"]')];
    let overlapping = 0;
    let clipped = 0;
    let measured = 0;
    for (const button of buttons) {
      const card = button.closest(".surface");
      const name = card?.querySelector("p");
      if (!name) continue;
      measured += 1;
      const a = name.getBoundingClientRect();
      const b = button.getBoundingClientRect();
      // The badge may sit over the portrait, never over the name.
      const intersects =
        a.right > b.left + 0.5 &&
        a.left < b.right - 0.5 &&
        a.bottom > b.top + 0.5 &&
        a.top < b.bottom - 0.5;
      if (intersects) overlapping += 1;
      if (name.scrollWidth > name.clientWidth + 1) {
        const style = getComputedStyle(name);
        if (style.textOverflow !== "ellipsis") clipped += 1;
      }
    }
    return { count: buttons.length, measured, overlapping, clipped };
  });
  check("/pit kit buttons found", grid.count > 20, `${grid.count} cards`);
  check(
    "/pit name is measurable on every card",
    grid.measured === grid.count,
    `${grid.measured} of ${grid.count}`,
  );
  check(
    "/pit kit button never covers the name",
    grid.overlapping === 0,
    `${grid.overlapping} of ${grid.measured} overlap`,
  );
  check(
    "/pit truncated names get an ellipsis, not a hard cut",
    grid.clipped === 0,
    `${grid.clipped} hard-cut`,
  );

  const overflow = await horizontalOverflow(page);
  check(
    "/pit has no horizontal overflow at 390px",
    overflow === null,
    overflow ? `${overflow.docWidth} > ${overflow.viewWidth}; ${overflow.offenders.join(" | ")}` : "",
  );
  await page.close();
}

// ------------------------------------------------------------ /pit filtering
{
  const page = await open("/pit", DESKTOP);
  const cards = () =>
    page.evaluate(
      () => document.querySelectorAll('button[aria-label$=" kit"]').length,
    );
  const before = await cards();

  await page.type('input[type="search"]', "vhagar");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 250)));
  const searched = await cards();
  check(
    "/pit search narrows the grid",
    searched > 0 && searched < before,
    `${before} -> ${searched} for "vhagar"`,
  );

  const name = await page.evaluate(() => {
    const first = document.querySelector('button[aria-label$=" kit"]');
    return first?.getAttribute("aria-label") ?? "";
  });
  check(
    "/pit search matches the typed dragon",
    name.toLowerCase().includes("vhagar"),
    name,
  );

  // Clearing via the field's own button must restore every card.
  await page.click('button[aria-label="Clear search"]');
  await page.evaluate(() => new Promise((r) => setTimeout(r, 250)));
  check("/pit clear search restores the grid", (await cards()) === before, `${before}`);

  // An ability term has to work too, or the index is only matching names.
  await page.type('input[type="search"]', "bulwark");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 250)));
  const ability = await cards();
  check(
    "/pit search matches ability text",
    ability > 0 && ability < before,
    `${ability} dragons provide Bulwark`,
  );
  await page.click('button[aria-label="Clear search"]');

  // Facet filters.
  await page.evaluate(() => {
    const chips = [...document.querySelectorAll("button")];
    chips.find((b) => b.textContent?.trim() === "Filters")?.click();
  });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));
  const legendary = await page.evaluate(async () => {
    const group = [...document.querySelectorAll('[role="group"]')].find(
      (g) => g.getAttribute("aria-label") === "Rarity",
    );
    const chip = [...(group?.querySelectorAll("button") ?? [])].find(
      (b) => b.textContent?.trim() === "Legendary",
    );
    chip?.click();
    await new Promise((r) => setTimeout(r, 250));
    return document.querySelectorAll('button[aria-label$=" kit"]').length;
  });
  check(
    "/pit rarity facet filters the grid",
    legendary > 0 && legendary < before,
    `${legendary} legendary of ${before}`,
  );

  const liveCount = await page.evaluate(
    () => document.querySelector('[aria-live="polite"]')?.textContent?.trim() ?? "",
  );
  check(
    "/pit announces the result count",
    liveCount.includes(String(legendary)),
    liveCount,
  );

  const emptyState = await page.evaluate(async () => {
    const input = document.querySelector('input[type="search"]');
    input.focus();
    return true;
  });
  if (emptyState) {
    await page.type('input[type="search"]', "zzzzzz");
    await page.evaluate(() => new Promise((r) => setTimeout(r, 250)));
    const empty = await page.evaluate(() => ({
      cards: document.querySelectorAll('button[aria-label$=" kit"]').length,
      hasClear: [...document.querySelectorAll("button")].some(
        (b) => b.textContent?.trim() === "Clear filters",
      ),
    }));
    check(
      "/pit shows a recoverable empty state",
      empty.cards === 0 && empty.hasClear,
      `cards=${empty.cards} clear=${empty.hasClear}`,
    );
  }
  await page.close();
}

// ----------------------------------------- destructive actions ask first
/*
 * Saved lines and kits live only in localStorage. Deleting one on the first
 * click is silent data loss, so each destructive control must prompt, and
 * dismissing the prompt must leave the data alone.
 */
{
  const seed = {
    version: 2,
    owned: [],
    customDragons: [],
    lineups: [
      {
        id: "lin-x",
        name: "Guarded line",
        kind: "theory",
        mode: "pvp",
        troop: "spearmen",
        notes: "",
        slots: { left: null, vanguard: null, right: null },
        ignoreLevel: false,
        craftStars: 0,
        updatedAt: new Date().toISOString(),
      },
    ],
    teams: [
      {
        id: "tm-x",
        name: "Guarded kit",
        description: "",
        lineupIds: ["lin-x"],
        updatedAt: new Date().toISOString(),
      },
    ],
  };

  for (const [path, label, countKey] of [
    ["/teams", "Disband this kit", "teams"],
    ["/lineups/lin-x", "Delete", "lineups"],
  ]) {
    const page = await browser.newPage();
    await page.setViewport(DESKTOP);
    await page.evaluateOnNewDocument((s) => {
      localStorage.setItem("dragonfire-pit.tutorial.v1", "1");
      localStorage.setItem("dragonfire-pit.v1", JSON.stringify(s));
    }, seed);
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

    let prompted = false;
    page.on("dialog", (d) => {
      prompted = true;
      void d.dismiss();
    });
    const clicked = await page.evaluate((text) => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        b.textContent?.trim().startsWith(text),
      );
      btn?.click();
      return !!btn;
    }, label);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

    const left = await page.evaluate((key) => {
      const raw = localStorage.getItem("dragonfire-pit.v1");
      return raw ? (JSON.parse(raw)[key]?.length ?? -1) : -1;
    }, countKey);

    check(`${path} has a ${label} control`, clicked, "");
    check(`${path} prompts before destroying data`, prompted, "");
    check(
      `${path} keeps the data when the prompt is dismissed`,
      left === 1,
      `${countKey}=${left}`,
    );
    await page.close();
  }
}

// ------------------------------------------- pick list keyboard navigation
/*
 * The pick grid derives its highlight from the dragon id the reader moved to,
 * so arrow keys, Home/End and a narrowing query all have to land on the row
 * Enter then commits. Asserting the seat that gets filled keeps this about
 * behaviour rather than which class paints the highlight.
 */
{
  const page = await open("/team", DESKTOP);

  async function openPicker(slot) {
    await page.evaluate((s) => {
      document.querySelector(`[data-team-seat="${s}"] button`)?.click();
    }, slot);
    await page.waitForSelector("#team-pick-search", { timeout: 10000 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 250)));
  }

  async function seated() {
    return page.evaluate(
      () =>
        document
          .querySelector("[data-team-seed]")
          ?.getAttribute("data-build-around") ?? null,
    );
  }

  // Enter with an untouched highlight commits the first selectable dragon.
  await openPicker("vanguard");
  const firstRow = await page.evaluate(
    () => document.querySelector("[data-pick-dragon]")?.dataset.pickDragon ?? null,
  );
  await page.focus("#team-pick-search");
  await page.keyboard.press("Enter");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  const viaEnter = await seated();
  check(
    "/team pick list commits the default highlight on Enter",
    viaEnter !== null && viaEnter === firstRow,
    `seated=${viaEnter} first=${firstRow}`,
  );

  // ArrowDown steps a grid row, so Enter has to commit a different dragon.
  await openPicker("vanguard");
  await page.focus("#team-pick-search");
  await page.keyboard.press("ArrowDown");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 150)));
  await page.keyboard.press("Enter");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  const viaArrow = await seated();
  check(
    "/team pick list moves the highlight with ArrowDown",
    viaArrow !== null && viaArrow !== viaEnter,
    `arrow=${viaArrow} default=${viaEnter}`,
  );

  // A narrowing query re-homes the highlight onto what is still listed.
  await openPicker("vanguard");
  await page.focus("#team-pick-search");
  await page.type("#team-pick-search", "syrax");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 350)));
  const narrowed = await page.evaluate(() => ({
    rows: document.querySelectorAll("[data-pick-dragon]").length,
    first:
      document.querySelector("[data-pick-dragon]")?.dataset.pickDragon ?? null,
  }));
  await page.keyboard.press("Enter");
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  const viaQuery = await seated();
  check(
    "/team pick list commits the searched dragon on Enter",
    narrowed.rows > 0 && viaQuery === narrowed.first,
    `rows=${narrowed.rows} seated=${viaQuery}`,
  );

  // Reopening on another slot must not inherit the previous slot's highlight.
  await openPicker("right");
  const rightDefault = await page.evaluate(
    () => document.querySelector("[data-pick-dragon]")?.dataset.pickDragon ?? null,
  );
  check(
    "/team pick list resets the highlight for a new slot",
    rightDefault !== null,
    `first=${rightDefault}`,
  );
  await page.close();
}

// ------------------------------------------------- Forums load failure + retry
{
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("dragonfire-pit.tutorial.v1", "1");
  });
  await page.setRequestInterception(true);
  let failNext = true;
  page.on("request", (req) => {
    if (failNext && req.url().includes("/api/forums")) {
      void req.abort("failed");
      return;
    }
    void req.continue();
  });
  await page.goto(`${BASE}/forums`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));

  const failed = await page.evaluate(() => {
    const alert = document.querySelector('[role="alert"]');
    return {
      shown: !!alert,
      text: alert?.textContent?.slice(0, 90) ?? "",
      hasRetry: [...document.querySelectorAll("button")].some(
        (b) => b.textContent?.trim() === "Try again",
      ),
    };
  });
  check(
    "/forums surfaces a load failure as an error, not as an empty board",
    failed.shown && !failed.text.includes("quiet"),
    failed.text,
  );
  check("/forums offers a retry", failed.hasRetry, "");

  // Let the retry succeed and confirm the page recovers.
  failNext = false;
  await page.evaluate(() => {
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent?.trim() === "Try again")
      ?.click();
  });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1200)));
  const recovered = await page.evaluate(
    () => !document.querySelector('[role="alert"]'),
  );
  check("/forums recovers after a successful retry", recovered, "");
  await page.close();
}

// ------------------------------------- mobile overflow and tap-target sweep
/**
 * Anything you are meant to tap should be at least 40px on its short edge.
 * `.tap` grows a small control's hit area with an ::after overlay without
 * changing its drawn size, so that counts too.
 */
async function smallTargets(page) {
  return page.evaluate(() => {
    const selector =
      'button, a[href], [role="button"], input:not([type="hidden"]), select, summary';
    const small = [];
    for (const el of document.querySelectorAll(selector)) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      // sr-only controls such as the skip link are 1x1 on purpose.
      if (box.width <= 2 && box.height <= 2) continue;
      // A link inside a sentence is sized by its line box. WCAG 2.5.8 exempts
      // these, and padding one out to 44px would wreck the paragraph.
      if (el.tagName === "A" && style.display === "inline") continue;
      const after = getComputedStyle(el, "::after");
      const grown =
        after.content !== "none" &&
        (parseFloat(after.minHeight) >= 44 || parseFloat(after.minWidth) >= 44);
      const h = grown ? Math.max(box.height, 44) : box.height;
      const w = grown ? Math.max(box.width, 44) : box.width;
      if (h < 40 || w < 28) {
        small.push(
          `${el.tagName.toLowerCase()}[${(el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "").slice(0, 20)}] ${Math.round(w)}x${Math.round(h)}`,
        );
      }
    }
    return small;
  });
}

for (const path of ["/pit", "/team", "/teams", "/lineups", "/counter", "/forums"]) {
  const page = await open(path, PHONE);
  const overflow = await horizontalOverflow(page);
  check(
    `${path} has no horizontal overflow at 390px`,
    overflow === null,
    overflow
      ? `${overflow.docWidth} > ${overflow.viewWidth}; ${overflow.offenders.join(" | ")}`
      : "",
  );
  const small = await smallTargets(page);
  check(
    `${path} mobile tap targets are at least 40px`,
    small.length === 0,
    small.length ? `${small.length}: ${small.slice(0, 5).join(", ")}` : "",
  );
  await page.close();
}

// -------------------------------------------------------- headings and focus
for (const path of ["/team", "/counter", "/pit", "/lineups", "/teams", "/forums"]) {
  const page = await open(path, DESKTOP);
  const doc = await page.evaluate(() => ({
    h1: document.querySelectorAll("h1").length,
    h2: document.querySelectorAll("h2").length,
    current: document.querySelectorAll("[aria-current]").length,
    main: document.querySelectorAll("main").length,
  }));
  check(`${path} has exactly one h1`, doc.h1 === 1, `h1=${doc.h1}`);
  check(`${path} has section headings`, doc.h2 > 0, `h2=${doc.h2}`);
  check(`${path} marks the active nav item`, doc.current > 0, `aria-current=${doc.current}`);
  check(`${path} has a main landmark`, doc.main === 1, `main=${doc.main}`);

  // Tabbing is real keyboard intent, so :focus-visible actually matches and
  // the outline can be measured rather than inferred from the stylesheet.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      width: parseFloat(style.outlineWidth) || 0,
      style: style.outlineStyle,
    };
  });
  check(
    `${path} draws a focus ring on the tabbed element`,
    focus !== null && focus.width >= 2 && focus.style !== "none",
    focus ? `${focus.tag} outline ${focus.width}px ${focus.style}` : "nothing focused",
  );
  await page.close();
}

await browser.close();

console.log(notes.join("\n"));
if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  console.log(failures.join("\n"));
  process.exit(1);
}
console.log(`\nAll ${notes.length} UI checks passed.`);
