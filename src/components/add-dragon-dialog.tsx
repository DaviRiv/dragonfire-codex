"use client";

import { useMemo, useState } from "react";
import { Chip, ChipRow } from "@/components/chip";
import { CatalogTile } from "@/components/dragon-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DRAGONS } from "@/data/dragons";
import { BREEDS, RARITIES, TROOP_TYPES, breedLabels, rarityLabels, troopLabels } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { Breed, Rarity, TroopType } from "@/lib/types";

export function AddDragonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, addFromCatalog, addCustomDragon } = usePit();
  const [tab, setTab] = useState<"catalog" | "custom">("catalog");
  const [query, setQuery] = useState("");
  const [breed, setBreed] = useState<Breed | "all">("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [troop, setTroop] = useState<TroopType | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DRAGONS.filter((d) => {
      if (q && !`${d.name} ${d.epithet} ${d.tags.join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      if (breed !== "all" && d.breed !== breed) return false;
      if (rarity !== "all" && d.rarity !== rarity) return false;
      if (troop !== "all" && !d.affinities.includes(troop)) return false;
      return true;
    });
  }, [query, breed, rarity, troop]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">Add a dragon</DialogTitle>
          <DialogDescription>
            Pull from the hatchery roster, or log an unlisted dragon you already hatched.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "catalog" ? "default" : "outline"}
            onClick={() => setTab("catalog")}
          >
            Hatchery
          </Button>
          <Button
            size="sm"
            variant={tab === "custom" ? "default" : "outline"}
            onClick={() => setTab("custom")}
          >
            Unlisted
          </Button>
        </div>
        {tab === "catalog" ? (
          <div className="flex min-h-0 flex-col gap-3">
            <Input
              placeholder="Search name, habit, or command…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ChipRow>
              <Chip active={breed === "all"} onClick={() => setBreed("all")}>
                All breeds
              </Chip>
              {BREEDS.map((b) => (
                <Chip key={b} active={breed === b} onClick={() => setBreed(b)}>
                  {breedLabels[b]}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow>
              <Chip active={rarity === "all"} onClick={() => setRarity("all")}>
                All rarities
              </Chip>
              {RARITIES.map((r) => (
                <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
                  {rarityLabels[r]}
                </Chip>
              ))}
            </ChipRow>
            <ChipRow>
              <Chip active={troop === "all"} onClick={() => setTroop("all")}>
                All affinities
              </Chip>
              {TROOP_TYPES.map((t) => (
                <Chip key={t} active={troop === t} onClick={() => setTroop(t)}>
                  {troopLabels[t]}
                </Chip>
              ))}
            </ChipRow>
            <div className="grid max-h-[50dvh] grid-cols-2 gap-3 overflow-y-auto sm:max-h-[46vh] lg:grid-cols-3">
              {filtered.length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No dragons match those filters. Add them as unlisted instead.
                </p>
              ) : (
                filtered.map((d) => (
                  <CatalogTile
                    key={d.id}
                    id={d.id}
                    name={d.name}
                    epithet={d.epithet}
                    breed={d.breed}
                    rarity={d.rarity}
                    affinities={d.affinities}
                    owned={state.owned.some((o) => o.dragonId === d.id)}
                    onAdd={() => addFromCatalog(d.id)}
                  />
                ))
              )}
            </div>
          </div>
        ) : (
          <CustomDragonForm
            onSubmit={(payload) => {
              const added = addCustomDragon(payload);
              if (added) onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomDragonForm({
  onSubmit,
}: {
  onSubmit: (payload: {
    name: string;
    epithet?: string;
    rarity: Rarity;
    breed: Breed;
    affinities: TroopType[];
    starRank: number;
    reignLevel: number;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [epithet, setEpithet] = useState("");
  const [rarity, setRarity] = useState<Rarity>("epic");
  const [breed, setBreed] = useState<Breed>("champion");
  const [affinities, setAffinities] = useState<TroopType[]>([]);
  const [starRank, setStarRank] = useState(1);
  const [reignLevel, setReignLevel] = useState(1);

  function toggleTroop(t: TroopType) {
    setAffinities((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, epithet, rarity, breed, affinities, starRank, reignLevel });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="custom-name">Name</Label>
        <Input
          id="custom-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vega, Termite, Meleys…"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="custom-epithet">Epithet (optional)</Label>
        <Input
          id="custom-epithet"
          value={epithet}
          onChange={(e) => setEpithet(e.target.value)}
          placeholder="The one that actually wins rallies"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Breed</Label>
          <div className="flex flex-wrap gap-1.5">
            {BREEDS.map((b) => (
              <Chip key={b} active={breed === b} onClick={() => setBreed(b)}>
                {breedLabels[b]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Rarity</Label>
          <div className="flex flex-wrap gap-1.5">
            {RARITIES.map((r) => (
              <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
                {rarityLabels[r]}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Positive affinities</Label>
        <div className="flex flex-wrap gap-1.5">
          {TROOP_TYPES.map((t) => (
            <Chip
              key={t}
              active={affinities.includes(t)}
              onClick={() => toggleTroop(t)}
            >
              {troopLabels[t]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="stars">Star rank (1–10)</Label>
          <Input
            id="stars"
            type="number"
            min={1}
            max={10}
            value={starRank}
            onChange={(e) => setStarRank(Number(e.target.value))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reign">Reign level</Label>
          <Input
            id="reign"
            type="number"
            min={1}
            max={80}
            value={reignLevel}
            onChange={(e) => setReignLevel(Number(e.target.value))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Add to pit</Button>
      </DialogFooter>
    </form>
  );
}
