# Dragonfire Pit

Unofficial fan tool for **Game of Thrones: Dragonfire**. Log the dragons you
hatched, then pick a three-dragon team. **Suggest team** ranks a line from
what you own (or from the hatchery in Theory). Nothing here is affiliated
with HBO, Warner Bros., or the game.

## What you can do

- **Team** — formation on the left (or on top on a phone). The full ranked
  list sits beside it on desktop, directly under it on mobile. Tap a lane,
  then pick from the column — every matching dragon is listed, best fit
  for **this team** first, hiding anyone already slotted. Ranking favors
  synergy plus damage and healing. Each row shows breed and command.
  Every row shows that dragon’s command. Select Vanguard to see front-line
  benefits (taunt, damage reduction, carry).
- **Pit** — your collection. Search, breed, rarity, and troop filters sit
  on the list. Star rank stays between reigns; reign level is this
  campaign. Slotting a team never adds a dragon here — you add them
  yourself.
- **Hatchery** — the roster, with official portraits from
  [gotdragonfire.com/dragons](https://gotdragonfire.com/dragons/) when the
  site has them. A few names are not listed there yet, so those keep
  stand-in art. Add a dragon to the pit, then pick it on Team.
- **Saved** (desktop nav, or Team → Saved) — named formations and optional
  teams that bundle several lines (PvP, rally, defense).

The layout is built for a phone in one hand: three bottom tabs, the team
then the ranked list, and on a wider screen the list is a full column on
the right so the formation stays in view.

Habit and command text uses the in-game keyword colors: **Physical**
orange, **Tactical** cyan, **Fire** red, **Recovery** green, with matching
stat and tag colors. Positive magnitudes are green; reductions are red.

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
this unofficial fan tool. Warner Bros. and HBO own that art.
