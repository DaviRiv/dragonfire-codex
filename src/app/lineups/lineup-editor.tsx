"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { DragonCard } from "@/components/dragon-card";
import { EmptyState } from "@/components/empty-state";
import { FormationBoard } from "@/components/formation-board";
import { SynergyPanel } from "@/components/synergy-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { findDragon } from "@/lib/dragons";
import {
  MODES,
  TROOP_TYPES,
  modeCopy,
  modeLabels,
  troopCounters,
  troopLabels,
} from "@/lib/labels";
import { analyzeLineup, summarizeLineup } from "@/lib/synergy";
import { usePit } from "@/lib/store";
import type { SlotId } from "@/lib/types";
import { Copy, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function LineupEditor({ lineupId }: { lineupId: string }) {
  const { ready, state, updateLineup, setSlot, deleteLineup } = usePit();
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<SlotId>("vanguard");
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");

  const lineup = state.lineups.find((l) => l.id === lineupId);

  useEffect(() => {
    if (!ready) return;
    if (lineup) return;
    const timer = window.setTimeout(() => router.replace("/lineups"), 250);
    return () => window.clearTimeout(timer);
  }, [ready, lineup, router]);

  const report = useMemo(
    () => (lineup ? analyzeLineup(lineup, state) : null),
    [lineup, state],
  );

  const bench = useMemo(() => {
    if (!lineup) return [];
    const q = query.trim().toLowerCase();
    return state.owned.filter((owned) => {
      const d = findDragon(owned.dragonId, state.customDragons);
      if (!d) return false;
      if (!q) return true;
      return `${d.name} ${d.epithet} ${d.breed}`.toLowerCase().includes(q);
    });
  }, [lineup, query, state.owned, state.customDragons]);

  if (!ready || !lineup || !report) {
    return <p className="text-sm text-muted-foreground">Opening formation…</p>;
  }

  const active = lineup;

  function place(ownedId: string) {
    const already = (Object.keys(active.slots) as SlotId[]).find(
      (s) => active.slots[s] === ownedId,
    );
    if (already === selectedSlot) {
      setSlot(active.id, selectedSlot, null);
      return;
    }
    setSlot(active.id, selectedSlot, ownedId);
    const order: SlotId[] = ["vanguard", "left", "right"];
    const next = order.find(
      (s) => s !== selectedSlot && !active.slots[s] && s !== already,
    );
    if (next) setSelectedSlot(next);
  }

  async function copySummary() {
    const text = summarizeLineup(active, state);
    await navigator.clipboard.writeText(text);
    toast.success("Copied lineup summary.");
  }

  const counter = troopCounters[lineup.troop];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <Label htmlFor="lineup-name">Lineup name</Label>
          <Input
            id="lineup-name"
            value={lineup.name}
            onChange={(e) => updateLineup(lineup.id, { name: e.target.value })}
            className="font-heading h-10 max-w-lg text-lg"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copySummary}>
            <Copy data-icon="inline-start" />
            Copy summary
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

      <div className="grid gap-3">
        <div>
          <p className="mb-2 text-xs tracking-[0.2em] text-muted-foreground">
            MODE
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((mode) => (
              <Chip
                key={mode}
                active={lineup.mode === mode}
                onClick={() => updateLineup(lineup.id, { mode })}
              >
                {modeLabels[mode]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {modeCopy[lineup.mode]}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs tracking-[0.2em] text-muted-foreground">
            TROOP TYPE
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TROOP_TYPES.map((troop) => (
              <Chip
                key={troop}
                active={lineup.troop === troop}
                onClick={() => updateLineup(lineup.id, { troop })}
              >
                {troopLabels[troop]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {counter.beats
              ? `${troopLabels[lineup.troop]} beat ${troopLabels[counter.beats]}${
                  counter.losesTo
                    ? ` and lose to ${troopLabels[counter.losesTo]}`
                    : ""
                }. ${counter.note}`
              : counter.note}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_20rem]">
        <FormationBoard
          lineup={lineup}
          state={state}
          selectedSlot={selectedSlot}
          onSelectSlot={(slot) => {
            if (selectedSlot === slot && lineup.slots[slot]) {
              setSlot(lineup.id, slot, null);
              return;
            }
            setSelectedSlot(slot);
          }}
        />
        <SynergyPanel report={report} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="lineup-notes">Notes</Label>
        <Textarea
          id="lineup-notes"
          value={lineup.notes}
          onChange={(e) => updateLineup(lineup.id, { notes: e.target.value })}
          placeholder="When to swap this in, habit order, who fills if a dragon is marching…"
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-xl tracking-wide">Bench</h2>
            <p className="text-sm text-muted-foreground">
              Selected lane: {selectedSlot}. Same dragon can sit in other saved
              lineups.
            </p>
          </div>
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus data-icon="inline-start" />
            Add dragon
          </Button>
        </div>
        <Input
          placeholder="Filter bench…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        {state.owned.length === 0 ? (
          <EmptyState
            title="No dragons in the pit"
            description="Add dragons, then slot them into this formation."
            action={
              <Button onClick={() => setAddOpen(true)}>Add dragons</Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bench.map((owned) => {
              const slotted = (Object.keys(lineup.slots) as SlotId[]).find(
                (s) => lineup.slots[s] === owned.id,
              );
              return (
                <DragonCard
                  key={owned.id}
                  owned={owned}
                  state={state}
                  selected={slotted === selectedSlot}
                  highlightTroop={lineup.troop}
                  onClick={() => place(owned.id)}
                  footer={
                    <p className="text-xs text-muted-foreground">
                      {slotted
                        ? `On ${slotted}`
                        : findDragon(owned.dragonId, state.customDragons)
                            ?.affinities.includes(lineup.troop)
                          ? `Matches ${troopLabels[lineup.troop]}`
                          : "No affinity match"}
                    </p>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
      <AddDragonDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-sm ring-1 ring-foreground/15",
        active
          ? "bg-amber-500/20 text-amber-100"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
