"use client";

import { useMemo } from "react";
import { getCatalogDragon } from "@/data/dragons";
import {
  BreedChip,
  DragonDamageChips,
} from "@/components/dragon-meta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { damageSummary, pitInspectReign, pitInspectStarRank } from "@/lib/pit-catalog";
import {
  breedLabels,
  rarityLabels,
  statLabels,
  STAT_KEYS,
} from "@/lib/labels";
import { dragonPower, formatPower, scaledStats } from "@/lib/scale-stats";
import { dragonRoles, roleShort } from "@/lib/roles";
import type { Dragon, OwnedDragon } from "@/lib/types";
import { cn } from "@/lib/utils";

const NUMERIC_ROWS: {
  key: string;
  label: string;
  read: (dragon: Dragon, owned?: OwnedDragon) => number;
}[] = [
  { key: "stars", label: "Star rank", read: (_, o) => o?.starRank ?? 0 },
  { key: "reign", label: "Reign level", read: (_, o) => (o ? o.reignLevel : 0) },
  {
    key: "power",
    label: "Hub power",
    read: (d, o) =>
      dragonPower(
        d.rarity,
        pitInspectStarRank(o),
        pitInspectReign(o),
      ),
  },
  ...STAT_KEYS.map((stat) => ({
    key: stat,
    label: statLabels[stat],
    read: (d: Dragon, o?: OwnedDragon) =>
      scaledStats(d, pitInspectStarRank(o), pitInspectReign(o))[stat],
  })),
];

export function DragonCompareDialog({
  dragonIds,
  ownedById,
  open,
  onOpenChange,
}: {
  dragonIds: string[];
  ownedById: Map<string, OwnedDragon>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dragons = useMemo(
    () =>
      dragonIds
        .map((id) => getCatalogDragon(id))
        .filter((row): row is Dragon => Boolean(row)),
    [dragonIds],
  );

  const highs = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of NUMERIC_ROWS) {
      let best = -Infinity;
      for (const dragon of dragons) {
        const v = row.read(dragon, ownedById.get(dragon.id));
        if (v > best) best = v;
      }
      map.set(row.key, best);
    }
    return map;
  }, [dragons, ownedById]);

  if (dragons.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">
            Compare dragons
          </DialogTitle>
          <DialogDescription>
            Higher numbers are highlighted — use judgment; more of a stat is not
            always the right pick for every role.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="sticky left-0 bg-popover py-2 pe-2 font-medium text-muted-foreground">
                  Attribute
                </th>
                {dragons.map((dragon) => (
                  <th key={dragon.id} className="px-2 py-2 align-bottom">
                    <p className="font-heading text-amber-50">{dragon.name}</p>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      <BreedChip breed={dragon.breed} />
                      <DragonDamageChips dragon={dragon} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareTextRow
                label="Breed (type)"
                dragons={dragons}
                value={(d) => breedLabels[d.breed]}
              />
              <CompareTextRow
                label="Damage"
                dragons={dragons}
                value={(d) => damageSummary(d)}
              />
              <CompareTextRow
                label="Rarity"
                dragons={dragons}
                value={(d) => rarityLabels[d.rarity]}
              />
              <CompareTextRow
                label="Comp roles"
                dragons={dragons}
                value={(d) =>
                  dragonRoles(d).map((r) => roleShort[r]).join(", ") || "—"
                }
              />
              {NUMERIC_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-border/30">
                  <td className="sticky left-0 bg-popover py-1.5 pe-2 text-muted-foreground">
                    {row.label}
                  </td>
                  {dragons.map((dragon) => {
                    const v = row.read(dragon, ownedById.get(dragon.id));
                    const hi = highs.get(row.key);
                    const highlight = hi != null && v === hi && dragons.length > 1;
                    return (
                      <td
                        key={dragon.id}
                        className={cn(
                          "px-2 py-1.5 text-right tabular-nums",
                          highlight && "font-semibold text-amber-100",
                        )}
                      >
                        {row.key === "power"
                          ? formatPower(v)
                          : v.toLocaleString()}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CompareTextRow({
  label,
  dragons,
  value,
}: {
  label: string;
  dragons: Dragon[];
  value: (dragon: Dragon) => string;
}) {
  return (
    <tr className="border-b border-border/30">
      <td className="sticky left-0 bg-popover py-1.5 pe-2 text-muted-foreground">
        {label}
      </td>
      {dragons.map((dragon) => (
        <td key={dragon.id} className="px-2 py-1.5 text-right">
          {value(dragon)}
        </td>
      ))}
    </tr>
  );
}