# Dragonfire Pit

Unofficial fan tool for **Game of Thrones: Dragonfire**. Log the dragons you
hatched, then pick a three-dragon team. **Suggest team** ranks a line from
what you own (or from the hatchery in Theory). Nothing here is affiliated
with HBO, Warner Bros., or the game.

## What you can do

- **Team** — formation on the left (or on top on a phone). The full ranked
  list sits beside it on desktop, directly under it on mobile. Tap a lane,
  then pick from the column — every matching dragon is listed, best fit
  for **this team** first, hiding anyone already slotted. Role filters on
  that list are dungeon jobs: **Healing**, **Tanking**, **Damage**, and
  **Crowd control** (Kalspire is both Damage and CC). Troop type and
  mode sit on the formation as chips. Search and the hatchery/pit
  pool stay on the pick list. Ranking fills composition in order: a
  healer if nobody Recovers, then damage mitigation (Taunt or Damage
  Received), then a damage dealer to finish. Feeding Burn so a tank’s
  Taunt can hit 50% does not outrank a missing healer. The formation is
  large so you can read the lane. Pick rows stay thin: name, role chips,
  and synergy, or the **vanguard skill** when that lane is selected.
  Healers always show the Recovery line with its star gate (Command,
  2★, 6★, 10★) so a 10★ habit is not mistaken for a Command heal.
  Gates you do not own yet (or that sit above the dragon in your pit)
  render in red with a warning icon — a 10★ Velar heal stays a goal
  until you actually have 10 stars.
  Turn on **Abilities** for command and the unique **(6+ stars)** skill.
  Open a row for the full command, Habits 1–5, vanguard skill, and stats
  at the bottom. When a pairing is live — Moondancer granting Crescent
  Blade to Malachite, or Syrax feeding First-Strike to Caraxes — the
  formation slot names the granted ability, hover shows the combat
  numbers, Watch out lists the same payoff, and **Full stats** on the
  selected slotted dragon opens the sheet with a Live synergy block.
  Those bonuses are kit effects, not added into Hub power.
  **Watch out** under the formation names idle kit (red) and
  *why* the kit wants it (Vhagar’s Taunt is 25%, or 50% against Burn),
  plus whether stars are too low, the partner is not in this three, they are
  already on another saved team, the Vanguard flank is empty, or the
  march troop does not match. Named partners come from kit text
  (Moondancer wants an ally Sentinel) and Hub `needs` (Caraxes wants
  First-Strike). A 6★ Slow on a 4★ Caraxes is a star warning, not a
  “missing teammate” guess. Suggest on a pit line only seats dragons you
  own. **Next army** opens a new pit team from leftovers (skip dragons
  already on another saved formation; **Allow reuse** if you want the
  in-game overlap). Theory can still slot unowned dragons — those rows
  are goals, not a march. Ability text, stats-by-level, troop counts,
  and Hub power come from [Dragonfire-Hub](https://dragonfire-hub.com/).
  Hub power is stars + reign only, not in-game Army Power.
  **Game** is three bullets from public Reign metadata: a three-dragon
  line, what survives a Campaign reset, and the troop triangle.
  **Why this team** splits pros (green, left) and cons (red, right).
  **ChatGPT** copies a filled prompt with your pit or the full hatchery.
  Paste it at chatgpt.com — this app never calls an API. Optional note
  (spear rally, skip Vhagar) goes into the same text.
  **Copilot** — a local ranker for three-dragon lines. Ask for the online
  DPS meta core, a shield PvP line, or who soaks if Vhagar is busy. The
  boards it picks sit beside the thread. **Seat on Team** saves that
  line. **Copy for ChatGPT** includes the current online meta: Left
  Malachite, Vanguard Vhagar, Right Venator as the best PvP DPS lineup.
- **Pit** — reign, notes, and which teams they sit on. Stars live in
  Hatchery (0★ means you do not have them). Slotting a team never changes
  stars.
- **Hatchery** — the full roster. Official portraits from
  [gotdragonfire.com/dragons](https://gotdragonfire.com/dragons/) when the
  site has them. Kit text, base stats, and star/reign scaling are pulled
  from [dragonfire-hub.com](https://dragonfire-hub.com/). One row of five
  stars: yellow (1★ each), then red from the left (2★ each). 10★ is five
  red. 0★ means you do not own them. Use − / + or open a dragon for
  Yellow 1–5 / Red 6–10. The magnifying glass opens that dragon’s kit:
  Vanguard benefits, Command, habits your stars already unlocked (selected
  automatically), and what still opens at 2 / 4 / 6 / 8 / 10★. Uncheck a
  habit if you have not bought it — it stays out of the live kit.
- **Saved** (desktop nav, or Team → Saved) — named formations and optional
  teams that bundle several lines (PvP, rally, defense).

The layout is built for a phone in one hand: four bottom tabs, the team
then the ranked list, and on a wider screen the list is a full column on
the right so the formation stays in view.

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

On Team, open **ChatGPT** to copy or export a filled prompt (dragon names,
not JSON) and paste it at chatgpt.com. The prompt includes **current
meta**: online PvP DPS is Left Malachite, Vanguard Vhagar, Right Venator.
Copilot on `/coach` ranks locally with the same rules as Suggest, and
seats that core when those names are free.

ChatGPT Plus is not required by this app. If you want a longer take,
copy the text and paste it yourself.
