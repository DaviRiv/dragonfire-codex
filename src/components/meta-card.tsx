"use client";

import { ONLINE_DPS_CORE } from "@/data/meta";
import { modeShort, troopShort } from "@/lib/labels";

export function MetaCard() {
  const line = ONLINE_DPS_CORE;
  return (
    <div className="rounded-2xl bg-card/70 px-3 py-2.5 ring-1 ring-foreground/10">
      <p className="font-heading text-[15px] tracking-wide">Current meta</p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        {line.where} · {troopShort[line.troop]} · {modeShort[line.mode]}
      </p>
      <p className="mt-1 text-[13px] leading-snug">
        Left {line.left.name} · Vanguard {line.vanguard.name} · Right{" "}
        {line.right.name}
      </p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        Best online DPS lineup. Copilot’s ChatGPT paste tells the model to treat
        this as the default PvP core when those names are free.
      </p>
    </div>
  );
}
