"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AbilityText } from "@/components/ability-text";
import { ChoiceButton } from "@/components/chip";
import { DragonSheet } from "@/components/dragon-sheet";
import { FormationBoard } from "@/components/formation-board";
import { StatGrid } from "@/components/dragon-profile";
import { EmptyState } from "@/components/empty-state";
import { StarRank } from "@/components/star-rank";
import { SuggestTile } from "@/components/suggest-tile";
import { SynergyPanel } from "@/components/synergy-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  lineupKindLabel,
  resolveSlot,
  slotOfDragon,
} from "@/lib/lineup";
import {
  MODES,
  TROOP_TYPES,
  modeShort,
  slotShort,
  troopCounters,
  troopLabels,
  troopShort,
} from "@/lib/labels";
import { suggestDragons, suggestFullLine } from "@/lib/suggest";
import { analyzeLineup, summarizeLineup } from "@/lib/synergy";
import { usePit } from "@/lib/store";
import type { Dragon, SlotId } from "@/lib/types";
import { Copy, Sparkles, Trash2 } from "lucide-react";

type TheoryPool = "all" | "owned" | "unowned";

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
    updateSlotPick,
    deleteLineup,
    loadSample,
  } = usePit();
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<SlotId>("vanguard");
  const [query, setQuery] = useState("");
  const [theoryPool, setTheoryPool] = useState<TheoryPool>("all");
  const [inspecting, setInspecting] = useState<Dragon | null>(null);

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
      (s) => !resolveSlot(lineup, state, s),
    );
    setSelectedSlot(empty ?? "vanguard");
    setQuery("");
    setTheoryPool("all");
  }

  const report = useMemo(
    () => (lineup ? analyzeLineup(lineup, state) : null),
    [lineup, state],
  );

  const suggestions = useMemo(() => {
    if (!lineup) return [];
    return suggestDragons({
      lineup,
      slot: selectedSlot,
      state,
      query,
      pool: lineup.kind === "theory" ? theoryPool : "all",
    });
  }, [lineup, selectedSlot, state, query, theoryPool]);

  if (!ready || !lineup || !report) {
    return <p className="text-sm text-muted-foreground">Opening formation…</p>;
  }

  const active = lineup;
  const isTheory = active.kind === "theory";
  const selectedResolved = resolveSlot(active, state, selectedSlot);
  const selectedDragon = selectedResolved?.dragon;

  function slottedHere(dragonId: string) {
    return slotOfDragon(active, state, dragonId);
  }

  function pick(dragonId: string) {
    const already = slottedHere(dragonId);
    if (already === selectedSlot) {
      setSlot(active.id, selectedSlot, null);
      return;
    }
    slotDragon(active.id, selectedSlot, dragonId);
    const order: SlotId[] = ["vanguard", "left", "right"];
    const next = order.find(
      (s) => s !== selectedSlot && !resolveSlot(active, state, s),
    );
    if (next) setSelectedSlot(next);
  }

  function fillLine() {
    const picks = suggestFullLine(active, state);
    if (picks.length === 0) {
      toast(
        isTheory
          ? "Every lane is already filled."
          : "Every lane is filled, or your pit has no more dragons for this troop.",
      );
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
  const visibleLimit = query.trim() || theoryPool !== "all" ? 36 : 24;
  const visible = suggestions.slice(0, visibleLimit);
  const pitEmpty = !isTheory && state.owned.length === 0;

  return (
    <div className="space-y-3 sm:space-y-6">
      {!embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="lineup-name">Lineup name</Label>
              <Badge variant="outline" className="rounded-md font-normal">
                {lineupKindLabel(active.kind)}
              </Badge>
            </div>
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

      <p className="text-sm text-muted-foreground">
        {isTheory
          ? "Theory craft any hatchery dragon and the stars you want. Nothing is added to your pit."
          : "Only dragons in your pit. Stars and reign come from the pit, live."}
      </p>

      <div>
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          TROOP
        </p>
        <div className="grid grid-cols-3 gap-2">
          {TROOP_TYPES.map((troop) => (
            <ChoiceButton
              key={troop}
              active={lineup.troop === troop}
              onClick={() => updateLineup(lineup.id, { troop })}
            >
              {troopShort[troop]}
            </ChoiceButton>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
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
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
          MODE
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {MODES.map((mode) => (
            <ChoiceButton
              key={mode}
              active={lineup.mode === mode}
              onClick={() => updateLineup(lineup.id, { mode })}
            >
              {modeShort[mode]}
            </ChoiceButton>
          ))}
        </div>
      </div>

      {!isTheory ? (
        <div>
          <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
            REIGN
          </p>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceButton
              active={!lineup.ignoreLevel}
              onClick={() => updateLineup(lineup.id, { ignoreLevel: false })}
            >
              Use reign level
            </ChoiceButton>
            <ChoiceButton
              active={lineup.ignoreLevel}
              onClick={() => updateLineup(lineup.id, { ignoreLevel: true })}
            >
              Ignore level
            </ChoiceButton>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {lineup.ignoreLevel
              ? "Suggestions rank by stars and kit only. Reign is hidden."
              : "Higher reign ranks a dragon above an equal-star alternative."}
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
            AIM FOR STARS
          </p>
          <StarRank
            value={lineup.craftStars}
            onChange={(craftStars) => updateLineup(lineup.id, { craftStars })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            New slots use ★{lineup.craftStars}. Change a slotted dragon below
            without touching your pit.
          </p>
        </div>
      )}

      <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 -mx-2 bg-background/95 px-2 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <FormationBoard
          lineup={lineup}
          state={state}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onClearSlot={(slot) => setSlot(lineup.id, slot, null)}
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading min-w-0 truncate text-lg tracking-wide">
            {selectedDragon
              ? `Replace ${selectedDragon.name}`
              : `Pick ${slotShort[selectedSlot]}`}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={fillLine}
            className="shrink-0"
            disabled={pitEmpty}
          >
            <Sparkles data-icon="inline-start" />
            Auto-fill
          </Button>
        </div>
        {selectedResolved ? (
          <div className="w-full rounded-2xl bg-card/70 p-3 ring-1 ring-foreground/10">
            <button
              type="button"
              onClick={() => setInspecting(selectedResolved.dragon)}
              className="w-full text-left"
            >
              <StatGrid stats={selectedResolved.dragon.stats} compact />
              <p className="mt-2 text-[10px] tracking-[0.2em] text-muted-foreground">
                HABIT
              </p>
              <p className="mt-1 line-clamp-3 text-sm">
                <AbilityText text={selectedResolved.dragon.habit} />
              </p>
              <p className="mt-2 text-[10px] tracking-[0.2em] text-muted-foreground">
                COMMAND
              </p>
              <p className="mt-1 line-clamp-3 text-sm">
                <AbilityText text={selectedResolved.dragon.command} />
              </p>
            </button>
            {isTheory ? (
              <div className="mt-3 border-t border-border/60 pt-3">
                <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">
                  SLOTTED STARS
                </p>
                <StarRank
                  value={selectedResolved.starRank}
                  onChange={(starRank) =>
                    updateSlotPick(active.id, selectedSlot, { starRank })
                  }
                />
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                ★{selectedResolved.starRank}
                {active.ignoreLevel
                  ? " from your pit"
                  : ` · Reign ${selectedResolved.reignLevel} from your pit`}
              </p>
            )}
            <p className="mt-2 text-xs text-amber-200/80">
              Tap the kit for full stats and abilities
            </p>
          </div>
        ) : null}

        {isTheory ? (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["all", "Hatchery"],
                ["unowned", "Not owned"],
                ["owned", "In pit"],
              ] as const
            ).map(([id, label]) => (
              <ChoiceButton
                key={id}
                active={theoryPool === id}
                onClick={() => setTheoryPool(id)}
              >
                {label}
              </ChoiceButton>
            ))}
          </div>
        ) : null}

        <Input
          placeholder={
            isTheory ? "Search hatchery…" : "Search your pit…"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
        />

        {pitEmpty ? (
          <EmptyState
            title="Your pit is empty"
            description="This builder only uses dragons you’ve logged, with their stars and reign. Add them in Hatchery, or load a sample."
            action={
              <div className="grid w-full max-w-sm gap-2">
                <Button onClick={loadSample}>Load sample pit</Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/hatchery")}
                >
                  Open hatchery
                </Button>
              </div>
            }
          />
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
            {isTheory
              ? "Nothing matches. Try Hatchery, or clear the search."
              : "Nothing in your pit matches. Add more dragons, or ignore search."}
          </p>
        ) : (
          <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10">
            {visible.map((suggestion) => (
              <li key={suggestion.dragon.id}>
                <SuggestTile
                  suggestion={suggestion}
                  selected={slottedHere(suggestion.dragon.id) === selectedSlot}
                  kind={active.kind}
                  ignoreLevel={active.ignoreLevel}
                  onPick={() => pick(suggestion.dragon.id)}
                  onInspect={() => setInspecting(suggestion.dragon)}
                />
              </li>
            ))}
          </ul>
        )}
        {suggestions.length > visibleLimit ? (
          <p className="text-xs text-muted-foreground">
            Showing the top {visibleLimit}. Search to find the rest.
          </p>
        ) : null}
      </section>

      <SynergyPanel report={report} />
      <DragonSheet
        dragon={inspecting}
        open={!!inspecting}
        onOpenChange={(next) => {
          if (!next) setInspecting(null);
        }}
        highlightTroop={lineup.troop}
        actionLabel={
          inspecting && slottedHere(inspecting.id) === selectedSlot
            ? "Remove from lane"
            : `Slot in ${slotShort[selectedSlot]}`
        }
        onAction={() => {
          if (!inspecting) return;
          pick(inspecting.id);
          setInspecting(null);
        }}
      />
    </div>
  );
}
