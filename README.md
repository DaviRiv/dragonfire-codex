# Dragonfire Pit

Unofficial fan tool for **Game of Thrones: Dragonfire**. Log the dragons you
hatched, then pick a three-dragon team. **Team** seats Left, Vanguard, and
Right one name at a time; the list of complete lines updates as you add
them. **Copilot** is a separate beta chat. Nothing
here is affiliated with HBO, Warner Bros., or the game.

## What you can do

- **First visit** — a short overlay explains the three seats, then optionally
  the pit roster (tap + on dragons you own; 0★ stays unowned). **Skip for now**
  is always available. The intro is stored separately from your pit
  (`dragonfire-pit.tutorial.v1`) and does not show again after Skip or Done.
  Returning browsers that already have a pit or saved lineups skip it.
- **Account** — register a username on this server (no email). That unlocks
  **Copilot** and lets you start Talk threads or reply. Passwords are stored
  as scrypt hashes in `data/` on the machine running the app. Set
  `AUTH_SECRET` in `.env` for a stable session key; otherwise one is written
  to `data/.auth-secret`.
- **Talk** (`/talk`) — a message board for three-dragon lines. Anyone can
  read. Register to start a thread or reply. Attach a reviewed line from
  **Discuss in Talk**. Categories: General, PvP, Rally, Defense, PvE,
  Gathering.
- **Team** (`/team`) — tap **Left**, **Vanguard**, or **Right** and pick from
  the same portrait grid as Counter (owned first; search is a blank field with
  a magnifying glass). You can start on any seat. After each name the page lists
  complete threes that keep those dragons in those seats. Tap an empty seat
  to lock the next one; the list narrows. Dragons already on the other
  seats stay visible but greyed. Owned picks copy their pit stars. The
  1–10★ stepper on a seat applies only to that dragon; other names are
  hypothetical goals unless they are in your pit. It still prefers a healer, a soak,
  and a damage seat, but it also keeps healer-and-finisher
  lines that skip a Taunt tank — so a march like Rhysarion / Malachite /
  Venator is listed when you build around any of those three. Champion Recovery
  kits that buff the Right Flank (Rhysarion) prefer Vanguard so that habit
  feeds the right seat; Left is still listed as a second seating of the same
  three names. Troop chips change
  the army the line marches with. Dragons are not tagged PvP or PvE —
  kit pairing is the same in either fight. Kalspire at ★6 lists **Panic**
  from Hub habit 3 plus the Star Progression glossary (“Deals Tactical
  Damage to the target each round.”). The other two seats are hypothetical
  goals — a ★6 Malachite
  line still seats Moondancer, and Pros/Cons name Hub gates such as
  Command “At 6+ Stars” rather than copying Malachite’s rank onto
  Moondancer. Other seats add their live Hub provides when those names
  have glossary lines, plus pairing payoffs and gaps. Highlight a line
  to read **Pros** and **Cons** on the right; the rest of the page stays
  put. **Use this team** saves it. **Tweak seats** opens the saved lineup
  editor. Copilot does not run here.
- **Counter** (`/counter`) — tap **Left**, **Vanguard**, and **Right** to seat
  the three dragons you have to beat. The picker is a portrait grid (not a
  dropdown): search is a blank field with a magnifying glass, owned dragons first.
  Troop affinity under each portrait is an icon (shields, spears, cavalry,
  archers, siege), not Cav/Shields text. After Left it asks for Vanguard, then
  Right. Dragons already on the other seats stay visible but greyed. Owned
  names copy their pit stars. Set 1–10★ on each name. Troop chips under the
  seats are their march. The page then lists complete threes. Tile triangle
  stays in-game (Cavalry beat Shields,
  Shields beat Archers, Archers beat Spears, Spears beat Cavalry; Siege
  loses to every troop) — Archers sit in that triangle. Against a named
  September 2026 community core, **You** opens on the community answer
  troop, which is not always the tile winner: Shields (Malachite / Vhagar /
  Venator **or Moondancer**) into the Syrax / Vaeldra / Caraxes Spearmen
  core; Cavalry **Seasmoke / Thunderstrike / Sheepstealer** into the
  Shieldbearer cores; Spearmen into Seasmoke Cavalry. Intel names that
  community seating and still prints the tile matchup. The list starts from
  a saved line book and never reseats a dragon already on their march. Pros
  name tile advantage, or **Community answer** when the kit is popular but
  loses the tile. When their line has live Recovery, lines that apply Stun,
  Overwhelm, or Prey (glossary text, Hub provides) are ranked up. Dragons
  in your pit keep their stars; everyone else is a goal. Load **DPS
  core**, **Moon line**, **Spear core**, or **Cav core**, or a saved lineup.
  Tap a seated name to change it. **Use this team** saves the counter march.
  Copilot does not run here.
- **Copilot (beta)** (`/coach`) — a local ranker for three-dragon lines
  (account required), separate from Team. Ask for the online DPS meta
  core, a shield PvP line, or who soaks if Vhagar is busy. It is a
  **conversation**, not one question at a time: it carries the troop, the
  mode, and everyone you asked it to leave out from turn to turn, so
  “what if I use cavalry?”, “replace Vhagar”, “give me another one
  without Malachite”, “which of those is strongest?”, “why?”, and “now
  build one for PvE” each build on the last answer. Every question keeps
  its own answer slot, so sending several in a row cannot cross the wires.
  Each answer prints the line as a board — **Left**, **Vanguard** (the
  seat that soaks), **Right**, then **Why** — and **Seat on Team** saves it.
  The thread survives a reload; **New chat** clears it. A failed answer
  says so in plain words and offers **Retry** rather than spinning. Copilot
  reads your pit at the moment it answers, so a star you just changed
  counts. **Copy for ChatGPT** includes the current online meta: Left
  Malachite, Vanguard Vhagar, Right Venator as the best PvP DPS lineup.
- **Pit** (`/pit`) — the full roster, including any **Unlisted** dragon you
  added. 0★ means you do not own them; slotting
  a team never changes stars. Tap a portrait to open the kit; owned dragons
  also get an **In your pit** block with the star rank, troop affinities,
  and jobs the ranker reads, an editable **reign level** (1–80), and the
  saved teams that dragon already sits on. `/hatchery` redirects here. Official portraits from
  [gotdragonfire.com/dragons](https://gotdragonfire.com/dragons/) when the
  site has them. Kit text, base stats, and star scaling are pulled
  from [dragonfire-hub.com](https://dragonfire-hub.com/). One row of five
  stars: yellow (1★ each), then red from the left (2★ each). 10★ is five
  red. 0★ means you do not own them. Use − / + to set rank. The
  magnifying glass opens that dragon’s kit:
  Vanguard, Command, and Habits 1–5. Live rows are highlighted; the list
  does not change as you star them. Uncheck a habit if you have not bought
  it — it stays out of the live kit. Rank diamonds 1–5 are habit upgrades;
  the paragraph percents follow the rank you pick (rank 1 is the Hub
  default on old saves). Hover or tap a named ability
  (Rallying Flame, New Moon, Full Moon, Taunt, …) or the habit title for
  the full in-game card: complete text plus rank 1–5 chances when those
  numbers change. Named buffs such as First-Strike, Double-Strike,
  Advantage, Rising Tide, and Crescent Blade open their own keyword
  card when you tap or click the word (hover also works on a computer)
  — not the parent habit. Buffs use a green up arrow. Spreading buffs
  such as Crescent Blade (granted onto an ally Sentinel) use a green
  share mark so they are not confused with Moondancer’s Command.
  Debuffs such as Overwhelm
  use a red down arrow. Habit upgrade Power *is* in the Hub dump
  (`power.habits`, by rarity, habit slot, and rank), but `dragonPower()` sums
  stars and reign level only, so it is not shown.
- **Guide** (`/guide`) — a beginner's guide in fourteen sections, also offered
  on the first-visit intro screen. Covers the three seats, what the four stats
  do (including that “enhanced by *Stat*” means a stat sets ability
  magnitudes, not just the plain combat number), why cutting **Damage
  Received** beats another damage buff, all eighteen in-game keyword lines,
  star rank versus reign level, habit slots and ranks, the four composition
  jobs, the tile triangle, modes, rarity and breed, and a closing list of what
  this site does *not* know. Every figure is derived from the Hub tables at
  build time and every ability is quoted out of the catalog by dragon and
  slot — see `src/lib/guide.ts`. `npm run check:guide` asserts those figures
  still match the raw tables and that each quoted ability still says what the
  prose claims, so a `sync-hub` run fails loudly instead of leaving the page
  confidently wrong.
- **Saved** (desktop nav, or Team → Tweak seats) — named formations and
  optional teams that bundle several lines (PvP, rally, defense). The
  editor is formation on the left (or on top on a phone) and a ranked
  pick list on the right. Tap a lane, then pick from the column — every
  matching dragon is listed, best fit for **this team** first, hiding
  anyone already slotted. Role filters are dungeon jobs: **Healing**,
  **Tanking**, **Damage**, and **Crowd control** (Kalspire is both Damage
  and CC). Ranking fills composition in order: a healer if nobody
  Recovers, then damage mitigation (Taunt or Damage Received), then a
  damage dealer to finish. Feeding Burn so a tank’s Taunt can hit 50%
  does not outrank a missing healer. Suggest on a pit line only seats
  dragons you own. **Next army** opens a new pit team from leftovers.
  Theory can still slot unowned dragons — those rows are goals, not a
  march. Ability text, stats-by-level, troop counts, and Hub power come
  from [Dragonfire-Hub](https://dragonfire-hub.com/). Hub power is from
  star rank. **Why this team** splits pros (green) and cons (red).
  **ChatGPT** copies a filled prompt. Paste it at chatgpt.com — this app
  never calls an API.
- **Dev** — personal metadata catalog, hidden unless you open
  `/dev?dev=1` once on this browser. Habit names from Star Progression
  screenshots live here (Moondancer, Venator, Malachite, Rhysarion,
  Sunfyre, Kalspire, Caraxes, Syrax, Vhagar, Vermax, Seasmoke, Crimson, Sheepstealer, Daemoros, Shadowsong, Tessarion, Tairax, Velar, Feskar, Zivern, Vaeldra, Tashix, Antares, Arrax, Arulix, Dawnseeker, Jagadrix, Nyrena, Bevlorin, Shimmer, Shadowrend, Solstryker, Thunderstrike, and Vesper are complete). `?dev=0` hides the tab.

The layout is built for a phone in one hand: six bottom tabs (Team, Counter,
Talk, Copilot, Pit, Guide). Copilot is marked **beta**. After you pick a dragon,
Team keeps the picker fixed, scrolls only the list of threes, and pins Pros
and Cons on the right (under the list on a phone).

Ad units follow a [Wowhead](https://www.wowhead.com/)-style page: leaderboard
under the header, 300×250 rectangles in the right rail, in-feed units on Talk,
and a 320×50 mobile banner above the tab bar. **AdSense** publisher
`pub-9733653923474794` (customer `7154488834`) is loaded on every page, and
`/ads.txt` advertises that id. Set `ADSENSE_SLOT_*` to the ad unit ids from
AdSense to fill those placements; until then they show house ads. Set
`GPT_AD_UNIT` instead for Ad Manager.

Habit and command text uses the in-game keyword colors: **Physical**
orange, **Tactical** purple, **Fire** red-orange, **Recovery** green,
with matching stat and tag colors. Positive magnitudes are green;
reductions are red.

```bash
npm install
npm run dev
```

Then open [http://localhost:43123](http://localhost:43123).

### Own domain on Vercel (cheapest fix for AdSense)

If `dragonfirecodex.com` shows **“The request could not be routed”**, DNS is pointed at
Cursor, not your host. See **[docs/host-on-vercel.md](docs/host-on-vercel.md)** for
free Vercel + Cloudflare DNS steps.

### Custom domain on Cursor Apps (when available)

1. In Cursor, open **dragonfire-pit** publish settings and attach
   `dragonfirecodex.com` (and `www` if you use it). Copy the DNS target Cursor
   shows.
2. In Cloudflare DNS, add the record Cursor specifies (often a `CNAME` for `www`;
   apex may use Cloudflare CNAME flattening).
3. Set app secret **`SITE_URL`** to `https://dragonfirecodex.com` (or your
   `www` URL) and republish.
4. AdSense: add that same `https://…` URL; verify
   `https://dragonfirecodex.com/ads.txt`.
5. Google sign-in: add redirect URI
   `https://dragonfirecodex.com/api/auth/google/callback` in Google Cloud.

To bind a specific host and port:

```bash
npx next dev --hostname 0.0.0.0 --port 43123
```

## Notes

Saved formations can reuse the same dragon — matching how Army Formations
work in-game even when a dragon is already marching. **Skip other teams**
(the default for new pit lines) hides those dragons from Suggest and
Next army so your 3rd and 4th marches get leftovers. Turn on **Allow
reuse** to mirror the game.

Hub power is not Army Power. Heirlooms, stronghold upgrades, and riders
are out of scope — we will not reverse-engineer those.

Portraits for dragons listed on the official site are copied from
[gotdragonfire.com](https://gotdragonfire.com/dragons/) for local use in
this unofficial fan tool. Warner Bros. and HBO own that art. Command,
habit, stat, troop, and power tables are transcribed from
[dragonfire-hub.com](https://dragonfire-hub.com/). Re-pull that catalog
with `npm run sync-hub`.

## ChatGPT and Copilot

Register an account to open **Copilot (beta)**. On a saved lineup, open
**ChatGPT** to copy a filled prompt (dragon names, not JSON) and paste it
at chatgpt.com. The prompt includes **current meta**: online PvP DPS is
Left Malachite, Vanguard Vhagar, Right Venator. Popular Shield thirds are
Moondancer and Rhysarion. Spearmen core is Syrax / Vaeldra / Caraxes.
Cavalry vs Shields is Seasmoke / Thunderstrike / Sheepstealer. Copilot on
`/coach` ranks locally with the same rules as Suggest, and seats that DPS
core when those names are free. Team and Counter also list a saved line book
(`src/data/line-book.ts`) seated with those same rules. Counter never
reseats a dragon already on their march. Team is where you pick one dragon
and choose among the lines built around that name. Treat Copilot seats as
a starting point, not a guarantee.

ChatGPT Plus is not required by this app. If you want a longer take,
copy the text and paste it yourself.

**OPENAI_API_KEY** is server-only (Cursor app secrets or `.env.local`, never
in the repo or `NEXT_PUBLIC_*`). When set, signed-in users can tap **Ask
ChatGPT** on a lineup or Copilot; otherwise copy the prompt to chatgpt.com.
Copilot’s local ranker never calls OpenAI. The only other secret the app uses is
`AUTH_SECRET`, which signs session cookies; it is read server-side only
(`src/lib/server/secret.ts`), is never prefixed `NEXT_PUBLIC_`, and falls
back to a generated `data/.auth-secret` written with mode 600.

## Checks

```bash
npm run check      # every rules and conversation check
npm run check:coach # Copilot thread memory, context window, persistence
npm run check:guide # guide figures and quotes still match the catalog
npx tsc --noEmit
npm run build
```
