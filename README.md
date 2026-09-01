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
  mode live under **Options** — they still steer ranking and affinity,
  they just are not how you hide dragons. Search and the hatchery/pit
  pool stay on the pick list. Ranking favors a missing healer, tank, or
  crowd-control kit the same way a group finder does. The formation is
  large so you can read the lane. Pick rows stay thin: name, role chips,
  and synergy, or the **vanguard skill** when that lane is selected.
  Healers always show the Recovery line with its star gate (Command,
  2★, 6★, 10★) so a 10★ habit is not mistaken for a Command heal.
  Gates you do not own yet (or that sit above the dragon in your pit)
  render in red with a warning icon — a 10★ Velar heal stays a goal
  until you actually have 10 stars.
  Turn on **Abilities** for command and the unique **(6+ stars)** skill.
  Open a row for the full command, Habits 1–5, vanguard skill, and stats
  at the bottom. Theory lines also show a compact **Pairing** summary
  under the formation (open it for the full pros and cons). Named
  partners come from kit text (Moondancer wants an ally Sentinel) and
  Hub `needs` (Caraxes wants First-Strike). Miss the partner and the
  panel spells out what never fires; slot them and it flips to a payoff.
  Ability text, stats-by-level, troop counts, and power come from
  [Dragonfire-Hub](https://dragonfire-hub.com/).
- **Pit** — your collection. Search, breed, rarity, and troop filters sit
  on the list. Star rank stays between reigns; reign level is this
  campaign. Slotting a team never adds a dragon here — you add them
  yourself.
- **Hatchery** — the roster, with official portraits from
  [gotdragonfire.com/dragons](https://gotdragonfire.com/dragons/) when the
  site has them. Kit text, base stats, and star/reign scaling are pulled
  from [dragonfire-hub.com](https://dragonfire-hub.com/). Names Hub lists
  as unreleased sit at the bottom. Add a dragon to the pit, then pick it
  on Team.
- **Saved** (desktop nav, or Team → Saved) — named formations and optional
  teams that bundle several lines (PvP, rally, defense).

The layout is built for a phone in one hand: three bottom tabs, the team
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
work in-game even when a dragon is already marching.

Portraits for dragons listed on the official site are copied from
[gotdragonfire.com](https://gotdragonfire.com/dragons/) for local use in
this unofficial fan tool. Warner Bros. and HBO own that art. Command,
habit, stat, troop, and power tables are transcribed from
[dragonfire-hub.com](https://dragonfire-hub.com/). Re-pull that catalog
with `npm run sync-hub`.
