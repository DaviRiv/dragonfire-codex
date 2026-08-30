"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Chip, ChipRow } from "@/components/chip";
import { FormationBoard } from "@/components/formation-board";
import { SuggestTile } from "@/components/suggest-tile";
import { SynergyPanel } from "@/components/synergy-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findDragon } from "@/lib/dragons";
import {
  MODES,
  TROOP_TYPES,
  modeLabels,
  slotShort,
  troopCounters,
  troopLabels,
  troopShort,
} from "@/lib/labels";
import { suggestDragons, suggestFullLine } from "@/lib/suggest";
import { analyzeLineup, summarizeLineup } from "@/lib/synergy";
import { usePit } from "@/lib/store";
import type { SlotId } from "@/lib/types";
import { Copy, Sparkles, Trash2 } from "lucide-react";

type Pool = "suggested" | "pit" | "all";

export function LineupEditor({
  lineupId,
  embedded,
}: {
  lineupId: string;
  embedded?: boolean;
}) {
  const {
    ready,
    state,
    updateLineup,
    setSlot,
    slotDragon,
    slotDragons,
    deleteLineup,
  } = usePit();
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<SlotId>("vanguard");
  const [query, setQuery] = useState("");
  const [pool, setPool] = useState<Pool>("suggested");

  const lineup = state.lineups.find((l) => l.id === lineupId);

  useEffect(() => {
    if (!ready || embedded) return;
    if (lineup) return;
    const timer = window.setTimeout(() => router.replace("/lineups"), 250);
    return () => window.clearTimeout(timer);
  }, [ready, lineup, router, embedded]);

  const [syncedId, setSyncedId] = useState(lineupId);
  if (lineup && syncedId !== lineup.id) {
    setSyncedId(lineup.id);
    const empty = (["vanguard", "left", "right"] as SlotId[]).find(
      (s) => !lineup.slots[s],
    );
    setSelectedSlot(empty ?? "vanguard");
    setQuery("");
    setPool("suggested");
  }

  const report = useMemo(
    () => (lineup ? analyzeLineup(lineup, state) : null),
    [lineup, state],
  );

  const suggestions = useMemo(() => {
    if (!lineup) return [];
    let list = suggestDragons({
      lineup,
      slot: selectedSlot,
      state,
      query,
    });
    if (pool === "pit") {
      list = list.filter((s) => s.owned);
    }
    return list;
  }, [lineup, selectedSlot, state, query, pool]);

  if (!ready || !lineup || !report) {
    return <p className="text-sm text-muted-foreground">Opening formation…</p>;
  }

  const active = lineup;
  const slottedHere = (catalogId: string) => {
    const owned = state.owned.find((o) => o.dragonId === catalogId);
    if (!owned) return undefined;
    return (["left", "vanguard", "right"] as SlotId[]).find(
      (s) => active.slots[s] === owned.id,
    );
  };

  function dragonInSlot(slot: SlotId) {
    const ownedId = active.slots[slot];
    if (!ownedId) return undefined;
    const owned = state.owned.find((o) => o.id === ownedId);
    if (!owned) return undefined;
    return findDragon(owned.dragonId, state.customDragons);
  }

  function pick(dragonId: string) {
    const already = slottedHere(dragonId);
    if (already === selectedSlot) {
      const owned = state.owned.find((o) => o.dragonId === dragonId);
      if (owned) setSlot(active.id, selectedSlot, null);
      return;
    }
    slotDragon(active.id, selectedSlot, dragonId);
    const order: SlotId[] = ["vanguard", "left", "right"];
    const next = order.find((s) => s !== selectedSlot && !active.slots[s]);
    if (next) setSelectedSlot(next);
  }

  function fillLine() {
    const picks = suggestFullLine(active, state);
    if (picks.length === 0) {
      toast("Every lane is already filled.");
      return;
    }
    slotDragons(
      active.id,
      picks.map((p) => ({ slot: p.slot, dragonId: p.dragon.id })),
    );
    toast.success(
      `Slotted ${picks.map((p) => p.dragon.name).join(", ")}.`,
    );
  }

  async function copySummary() {
    const text = summarizeLineup(active, state);
    await navigator.clipboard.writeText(text);
    toast.success("Copied lineup summary.");
  }

  const counter = troopCounters[lineup.troop];
  const selectedDragon = dragonInSlot(selectedSlot);
  const visibleLimit = pool === "all" || query.trim() ? 30 : 18;
  const visible = suggestions.slice(0, visibleLimit);

  return (
    <div className="space-y-4 sm:space-y-6">
      {!embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="lineup-name">Lineup name</Label>
            <Input
              id="lineup-name"
              value={lineup.name}
              onChange={(e) => updateLineup(lineup.id, { name: e.target.value })}
              className="font-heading max-w-lg text-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button variant="outline" onClick={copySummary}>
              <Copy data-icon="inline-start" />
              Copy
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteLineup(lineup.id);
                router.push("/lineups");
              }}
            >
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="lineup-name">Lineup name</Label>
            <Input
              id="lineup-name"
              value={lineup.name}
              onChange={(e) => updateLineup(lineup.id, { name: e.target.value })}
              className="font-heading text-lg"
            />
          </div>
          <Button variant="outline" size="icon" onClick={copySummary}>
            <Copy />
            <span className="sr-only">Copy summary</span>
          </Button>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground sm:text-xs">
          TROOP TYPE
        </p>
        <ChipRow>
          {TROOP_TYPES.map((troop) => (
            <Chip
              key={troop}
              active={lineup.troop === troop}
              onClick={() => updateLineup(lineup.id, { troop })}
            >
              <span className="sm:hidden">{troopShort[troop]}</span>
              <span className="hidden sm:inline">{troopLabels[troop]}</span>
            </Chip>
          ))}
        </ChipRow>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
          {counter.beats
            ? `${troopLabels[lineup.troop]} beat ${troopLabels[counter.beats]}${
                counter.losesTo
                  ? `, lose to ${troopLabels[counter.losesTo]}`
                  : ""
              }.`
            : counter.note}
        </p>
      </div>

      <div>
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground sm:text-xs">
          MODE
        </p>
        <ChipRow>
          {MODES.map((mode) => (
            <Chip
              key={mode}
              active={lineup.mode === mode}
              onClick={() => updateLineup(lineup.id, { mode })}
            >
              {modeLabels[mode]}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)]">
        <FormationBoard
          lineup={lineup}
          state={state}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onClearSlot={(slot) => setSlot(lineup.id, slot, null)}
        />
        <section className="space-y-3">
          <div className="flex flex-col gap-2">
            <div>
              <h2 className="font-heading text-lg tracking-wide sm:text-xl">
                Pick for {slotShort[selectedSlot]}
              </h2>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {selectedDragon
                  ? `Replace ${selectedDragon.name}, or tap another lane.`
                  : `Tap a dragon ranked for ${troopLabels[lineup.troop]}.`}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={fillLine}
              className="w-full sm:w-auto"
            >
              <Sparkles data-icon="inline-start" />
              Fill empty lanes
            </Button>
          </div>
          <ChipRow>
            {(
              [
                ["suggested", "Suggested"],
                ["pit", "Your pit"],
                ["all", "All dragons"],
              ] as const
            ).map(([id, label]) => (
              <Chip
                key={id}
                active={pool === id}
                onClick={() => setPool(id)}
              >
                {label}
              </Chip>
            ))}
          </ChipRow>
          <Input
            placeholder="Search name, breed, or habit…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
              {pool === "pit"
                ? "Nothing in your pit matches. Slot from Suggested — they land in the pit automatically."
                : "Nothing matches. Try All dragons, or clear the search."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visible.map((suggestion) => (
                <SuggestTile
                  key={suggestion.dragon.id}
                  suggestion={suggestion}
                  selected={slottedHere(suggestion.dragon.id) === selectedSlot}
                  onPick={() => pick(suggestion.dragon.id)}
                />
              ))}
            </div>
          )}
          {suggestions.length > visibleLimit ? (
            <p className="text-xs text-muted-foreground">
              Showing the top {visibleLimit}. Search or open All dragons to go
              further.
            </p>
          ) : null}
        </section>
      </div>

      <SynergyPanel report={report} />
    </div>
  );
}
