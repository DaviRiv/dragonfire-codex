# Dragonfire Pit

Unofficial fan tool for **Game of Thrones: Dragonfire**. Open the site and go
straight into picking a troop, a lane, and a suggested dragon. Slotting a
dragon also adds it to your pit.

Nothing here is affiliated with HBO, Warner Bros., or the game. Dragon stats
and habits are compiled from public community sources and can drift after
patches.

## What you can do

- **Build** — the home screen. Choose troop type and a lane; suggestions rank
  hatchery dragons for that combination. Tap to slot. Fill empty lanes in one
  shot if you want a starter line.
- **Hatchery** — original portraits for every dragon in the roster.
- **Pit** — your collection with star rank (1–10) and reign level. Export and
  import JSON backups here. Unlisted dragons can be recorded by hand.
- **Lineups** — saved formations. Open one to keep picking.
- **Teams** — attach several lineups into one kit (for example a war kit with
  PvP, rally, and defense).

The layout is built for a phone in one hand: bottom tabs, a three-lane
formation that stays in a row, and suggestion tiles you can tap without
pinching.

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
