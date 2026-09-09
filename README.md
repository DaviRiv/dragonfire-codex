# Dragonfire Pit

Unofficial fan tool for **Game of Thrones: Dragonfire**. Log the dragons you
hatched, then pick a three-dragon team. **Team** is the main table: pick the
one dragon you want to build around, then choose among complete lines the
builder seats for that name. **Copilot** is a separate beta chat. Nothing
here is affiliated with HBO, Warner Bros., or the game.

## What you can do

- **Account** — register a username on this server (no email). That unlocks
  **Copilot** and lets you start Talk threads or reply. Passwords are stored
  as scrypt hashes in `data/` on the machine running the app. Set
  `AUTH_SECRET` in `.env` for a stable session key; otherwise one is written
  to `data/.auth-secret`.
- **Talk** (`/talk`) — a message board for three-dragon lines. Anyone can
  read. Register to start a thread or reply. Attach a reviewed line from
  **Discuss in Talk**. Categories: General, PvP, Rally, Defense, PvE,
  Gathering.
- **Team** (`/team`) — pick **one** released dragon and the 1–10★ rank you
  have. The page does not list the pit as a pick column. It builds
  several complete three-dragon lines around that name. It still prefers a
  healer, a soak, and a damage seat, but it also keeps healer-and-finisher
  lines that skip a Taunt tank — so a march like Rhysarion / Malachite /
  Venator is listed when you build around any of those three. Champion Recovery
  kits that buff the Right Flank (Rhysarion) prefer Vanguard so that habit
  feeds the right seat; Left is still listed as a second seating of the same
  three names. Troop chips change
  the army the line marches with. Dragons are not tagged PvP or PvE —
  kit pairing is the same in either fight. Kalspire at ★6 lists **Panic**
  from Hub habit 3 plus the Star Progression glossary (“Deals Tactical
  Damage to the target each round.”). The star stepper applies only to
  that dragon. The other two seats are hypothetical goals — a ★6 Malachite
  line still seats Moondancer, and Pros/Cons name Hub gates such as
  Command “At 6+ Stars” rather than copying Malachite’s rank onto
  Moondancer. Other seats add their live Hub provides when those names
  have glossary lines, plus pairing payoffs and gaps. Highlight a line
  to read **Pros** and **Cons** on the right; the rest of the page stays
  put. **Use this team** saves it. **Tweak seats** opens the saved lineup
  editor. Copilot does not run here.
- **Counter** (`/counter`) — tap **Left**, **Vanguard**, and **Right** to seat
  the three dragons you have to beat from one pit list (it fills the
  page, not a dropdown on each seat). After Left it asks for Vanguard, then
  Right. Set 1–10★ on each name. Troop chips are their march. The page then
  lists complete threes. Tile triangle stays in-game (Cavalry beat Shields,
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
  core, a shield PvP line, or who soaks if Vhagar is busy. Ranked seats
  sit beside the thread. **Seat on Team** saves that line. **Copy for
  ChatGPT** includes the current online meta: Left Malachite, Vanguard
  Vhagar, Right Venator as the best PvP DPS lineup.
- **Pit** (`/pit`) — the full roster. 0★ means you do not own them; slotting
  a team never changes stars. `/hatchery` redirects here. Official portraits from
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
  use a red down arrow. Habit upgrade Power is not in the Hub dump, so
  it is not shown.
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

The layout is built for a phone in one hand: five bottom tabs (Team, Counter,
Talk, Copilot, Pit). Copilot is marked **beta**. After you pick a dragon,
Team keeps the picker fixed, scrolls only the list of threes, and pins Pros
and Cons on the right (under the list on a phone).

Ad units follow a [Wowhead](https://www.wowhead.com/)-style page: Google
Publisher Tag (`gpt.js`) leaderboard under the header, 300×250 rectangles in
the right rail (hidden on Team and saved lineups so those pages can use the
width), an in-feed unit on Talk, and a 320×50 mobile banner above the
tab bar. Set `NEXT_PUBLIC_GPT_AD_UNIT` (Ad Manager) or
`NEXT_PUBLIC_ADSENSE_CLIENT` plus slot IDs. With those empty, the same slots
show labeled house ads so the layout is visible without a publisher account.

Habit and command text uses the in-game keyword colors: **Physical**
orange, **Tactical** purple, **Fire** red-orange, **Recovery** green,
with matching stat and tag colors. Positive magnitudes are green;
reductions are red.

```bash
npm install
npm run dev
```

Then open [http://localhost:43123](http://localhost:43123).

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
