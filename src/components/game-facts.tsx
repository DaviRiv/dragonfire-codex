import { GAME_FACTS } from "@/data/game-facts";

export function GameFacts() {
  return (
    <div className="rounded-2xl bg-card/70 px-3 py-2.5 ring-1 ring-foreground/10">
      <p className="font-heading text-[15px] tracking-wide">Game</p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-snug text-foreground/85">
        {GAME_FACTS.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </div>
  );
}
