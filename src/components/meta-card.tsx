"use client";

import { CURRENT_META_LINES } from "@/data/meta";
import { modeShort, troopShort } from "@/lib/labels";

export function MetaCard() {
  return (
    <div className="rounded-2xl surface px-3 py-2.5 ring-1 ring-foreground/10">
      <p className="font-heading text-[15px] tracking-wide">Current meta</p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
        September 2026 community cores · online PvP. Tile triangle is still
        Cavalry &gt; Shields &gt; Archers &gt; Spears &gt; Cavalry.
      </p>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-snug">
        {CURRENT_META_LINES.filter((line) =>
          ["online-dps", "spear-syrax", "cav-sea", "archer-zivern"].includes(
            line.id,
          ),
        ).map((line) => (
          <li key={line.id}>
            <span className="text-amber-100/80 uppercase tracking-wide text-[11px]">
              {troopShort[line.troop]}
            </span>
            {" · "}
            {line.left.name} / {line.vanguard.name} / {line.right.name}
            <span className="text-muted-foreground">
              {" "}
              · {modeShort[line.mode]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
        Popular Shield thirds: Moondancer or Rhysarion. Cavalry alt: Shadowsong /
        Daemoros / Kalspire. Copilot’s ChatGPT paste treats Malachite / Vhagar /
        Venator as the default Shield DPS core when those names are free.
      </p>
    </div>
  );
}
