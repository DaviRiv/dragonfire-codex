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
      const row = button.parentElement;
      const name = row?.querySelector("p");
      if (!name) continue;
      measured += 1;
      const a = name.getBoundingClientRect();
      const b = button.getBoundingClientRect();
      // Any horizontal intersection means the name is drawn under the icon.
      if (a.right > b.left + 0.5 && a.left < b.right) overlapping += 1;
      if (name.scrollWidth > name.clientWidth + 1) {
        const style = getComputedStyle(name);
        if (style.textOverflow !== "ellipsis") clipped += 1;
      }
    }
    return { count: buttons.length, measured, overlapping, clipped };
  });
  check("/pit kit buttons found", grid.count > 20, `${grid.count} cards`);
  check(
    "/pit name never overlaps the kit icon",
    grid.overlapping === 0,
    `${grid.overlapping} of ${grid.measured} overlap`,
  );
  check(
    "/pit truncated names get an ellipsis, not a hard cut",
    grid.clipped === 0,
    `${grid.clipped} hard-cut`,
  );

  const taps = await page.evaluate(() => {
    const selector =
      'button, a[href], [role="button"], input:not([type="hidden"]), select, summary';
    const small = [];
    for (const el of document.querySelectorAll(selector)) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (getComputedStyle(el).visibility === "hidden") continue;
      // sr-only controls (the skip link) are 1x1 on purpose.
      if (box.width <= 2 && box.height <= 2) continue;
      // `.tap` grows the hit area with an ::after overlay; measure that instead.
      const after = getComputedStyle(el, "::after");
      const grown =
        after.content !== "none" &&
        (parseFloat(after.minHeight) >= 44 || parseFloat(after.minWidth) >= 44);
      const h = grown ? Math.max(box.height, 44) : box.height;
      const w = grown ? Math.max(box.width, 44) : box.width;
      if (h < 40 || w < 24) {
        small.push(
          `${el.tagName.toLowerCase()}[${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 18) ?? ""}] ${Math.round(w)}x${Math.round(h)}`,
        );
      }
    }
    return small;
  });
  check(
    "/pit mobile controls are at least 40px tall",
    taps.length === 0,
    taps.length ? `${taps.length} small: ${taps.slice(0, 5).join(", ")}` : "",
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

// ------------------------------------------------------- mobile overflow pass
for (const path of ["/team", "/teams", "/lineups", "/counter", "/guide", "/talk"]) {
  const page = await open(path, PHONE);
  const overflow = await horizontalOverflow(page);
  check(
    `${path} has no horizontal overflow at 390px`,
    overflow === null,
    overflow
      ? `${overflow.docWidth} > ${overflow.viewWidth}; ${overflow.offenders.join(" | ")}`
      : "",
  );
  await page.close();
}

// -------------------------------------------------------- headings and focus
for (const path of ["/team", "/counter", "/pit", "/lineups", "/teams", "/talk", "/guide"]) {
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
