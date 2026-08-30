# Dragonfire Pit

Unofficial fan tool for **Game of Thrones: Dragonfire**. Log the dragons you hatched, slot them into Left Flank / Vanguard / Right Flank lineups, and group those lineups into teams.

Nothing here is affiliated with HBO, Warner Bros., or the game. Dragon stats and habits are compiled from public community sources and can drift after patches.

## What you can do

- **Pit** — add dragons from a 36-dragon hatchery, or record an unlisted one. Set star rank (1–10) and reign level.
- **Lineups** — three-lane formation board, troop type, and mode (PvP, PvE, rally, castle defense, gathering). A read-out flags affinity matches, taunt placement, and flank habits.
- **Teams** — attach several lineups into one kit (for example a war kit with PvP, rally, and defense).
- **Backup** — everything lives in this browser. Export and import JSON from the overview page.

## Run locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

To bind a specific host and port:

```bash
npx next dev --hostname 0.0.0.0 --port 43123
```

## Notes

Saved formations can reuse the same dragon — matching how Army Formations work in-game even when a dragon is already marching.
