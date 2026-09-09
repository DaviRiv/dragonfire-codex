"use client";

import { useState } from "react";
import { Chip } from "@/components/chip";
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
  const { addCustomDragon } = usePit();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-wide">
            Unlisted dragon
          </DialogTitle>
          <DialogDescription>
            Catalog names are marked owned in the pit. Use this only for a
            dragon Hub does not list yet.
          </DialogDescription>
        </DialogHeader>
        <CustomDragonForm
          onSubmit={(payload) => {
            const added = addCustomDragon(payload);
            if (added) onOpenChange(false);
          }}
        />
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
  }) => void;
}) {
  const [name, setName] = useState("");
  const [epithet, setEpithet] = useState("");
  const [rarity, setRarity] = useState<Rarity>("epic");
  const [breed, setBreed] = useState<Breed>("champion");
  const [affinities, setAffinities] = useState<TroopType[]>([]);
  const [starRank, setStarRank] = useState(1);

  function toggleTroop(troop: TroopType) {
    setAffinities((prev) =>
      prev.includes(troop) ? prev.filter((row) => row !== troop) : [...prev, troop],
    );
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          name,
          epithet,
          rarity,
          breed,
          affinities,
          starRank,
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="custom-name">Name</Label>
        <Input
          id="custom-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Vega, Termite, Meleys…"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="custom-epithet">Epithet (optional)</Label>
        <Input
          id="custom-epithet"
          value={epithet}
          onChange={(event) => setEpithet(event.target.value)}
          placeholder="The one that actually wins rallies"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Breed</Label>
          <div className="flex flex-wrap gap-1.5">
            {BREEDS.map((row) => (
              <Chip
                key={row}
                active={breed === row}
                onClick={() => setBreed(row)}
              >
                {breedLabels[row]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label>Rarity</Label>
          <div className="flex flex-wrap gap-1.5">
            {RARITIES.map((row) => (
              <Chip
                key={row}
                active={rarity === row}
                onClick={() => setRarity(row)}
              >
                {rarityLabels[row]}
              </Chip>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Positive affinities</Label>
        <div className="flex flex-wrap gap-1.5">
          {TROOP_TYPES.map((troop) => (
            <Chip
              key={troop}
              active={affinities.includes(troop)}
              onClick={() => toggleTroop(troop)}
            >
              {troopLabels[troop]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="stars">Star rank (1–10)</Label>
        <Input
          id="stars"
          type="number"
          min={1}
          max={10}
          value={starRank}
          onChange={(event) => setStarRank(Number(event.target.value))}
        />
      </div>
      <DialogFooter>
        <Button type="submit">Save unlisted</Button>
      </DialogFooter>
    </form>
  );
}
