"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { DragonSheet } from "@/components/dragon-sheet";
import { FormationBoard } from "@/components/formation-board";
import { EmptyState } from "@/components/empty-state";
import { StarRank } from "@/components/star-rank";
import { SuggestTile } from "@/components/suggest-tile";
import { SynergyPanel } from "@/components/synergy-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filledCount,
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
import { usePit } from "@/lib/store";
import type { Dragon, Lineup, SlotId } from "@/lib/types";
import { analyzeLineup, summarizeLineup, type SynergyReport } from "@/lib/synergy";
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
    updateOwned,
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
      includeSlotted: true,
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
    const filled = filledCount(active, state);
    const picks = suggestFullLine(active, state, { replace: filled === 3 });
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
      { replace: filled === 3 },
    );
    toast.success(
      filled === 3
        ? `Suggested ${picks.map((p) => p.dragon.name).join(", ")}.`
        : `Slotted ${picks.map((p) => p.dragon.name).join(", ")}.`,
    );
  }

  async function copySummary() {
    const text = summarizeLineup(active, state);
    await navigator.clipboard.writeText(text);
    toast.success("Copied lineup summary.");
  }

  const counter = troopCounters[lineup.troop];
  const pitEmpty = !isTheory && state.owned.length === 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] lg:items-start lg:gap-4">
      <div className="space-y-2 lg:sticky lg:top-[calc(3.5rem+env(safe-area-inset-top))]">
        <FormationBoard
          lineup={lineup}
          state={state}
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          onClearSlot={(slot) => setSlot(lineup.id, slot, null)}
          onNameChange={(name) => updateLineup(lineup.id, { name })}
        >
          <div className="flex flex-wrap gap-1">
            {TROOP_TYPES.map((troop) => (
              <MiniChip
                key={troop}
                active={lineup.troop === troop}
                onClick={() => updateLineup(lineup.id, { troop })}
              >
                {troopShort[troop]}
              </MiniChip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {MODES.map((mode) => (
              <MiniChip
                key={mode}
                active={lineup.mode === mode}
                onClick={() => updateLineup(lineup.id, { mode })}
              >
                {modeShort[mode]}
              </MiniChip>
            ))}
          </div>
          <p className="text-[11px] text-amber-100/70">
            {counter.beats
              ? `${troopLabels[lineup.troop]} beat ${troopLabels[counter.beats]}${
                  counter.losesTo
                    ? `, lose to ${troopLabels[counter.losesTo]}`
                    : ""
                }.`
              : counter.note}
          </p>
        </FormationBoard>

        {isTheory && selectedResolved ? (
          <div className="rounded-xl bg-card/70 p-2 ring-1 ring-foreground/10">
            <p className="mb-1 text-[10px] tracking-[0.2em] text-muted-foreground">
              STARS · {selectedDragon?.name}
            </p>
            <StarRank
              value={selectedResolved.starRank}
              onChange={(starRank) =>
                updateSlotPick(active.id, selectedSlot, { starRank })
              }
            />
          </div>
        ) : null}

        <div className="hidden space-y-2 lg:block">
          <TeamExtras
            isTheory={isTheory}
            lineup={lineup}
            embedded={embedded}
            report={report}
            onUpdate={(patch) => updateLineup(lineup.id, patch)}
            onCopy={copySummary}
            onDelete={() => {
              deleteLineup(lineup.id);
              router.push("/lineups");
            }}
            onSaved={() => router.push("/lineups")}
          />
        </div>
      </div>

      <section className="mt-3 min-w-0 space-y-2 lg:mt-0">
        <div className="flex items-center gap-2">
          <h2 className="font-heading min-w-0 flex-1 truncate text-lg tracking-wide">
            {selectedDragon
              ? `Replace ${selectedDragon.name}`
              : `Pick ${slotShort[selectedSlot]}`}
          </h2>
          <Button
            size="sm"
            onClick={fillLine}
            className="shrink-0"
            disabled={pitEmpty}
          >
            <Sparkles data-icon="inline-start" />
            Suggest team
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {pitEmpty
            ? "Log dragons in the pit to rank a team."
            : `${suggestions.length} ranked for ${slotShort[selectedSlot].toLowerCase()}`}
        </p>

        {isTheory ? (
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["all", "Hatchery"],
                ["unowned", "Not owned"],
                ["owned", "In pit"],
              ] as const
            ).map(([id, label]) => (
              <MiniChip
                key={id}
                active={theoryPool === id}
                onClick={() => setTheoryPool(id)}
              >
                {label}
              </MiniChip>
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
            title="Add your dragons first"
            description="Log hatched dragons in the pit, then come back and pick a team. Suggest team ranks what you own."
            action={
              <div className="grid w-full max-w-sm gap-2">
                <Button onClick={loadSample}>Load sample pit</Button>
                <Button variant="outline" onClick={() => router.push("/pit")}>
                  Open pit
                </Button>
              </div>
            }
          />
        ) : suggestions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/80 px-4 py-8 text-center text-sm text-muted-foreground">
            {isTheory
              ? "Nothing matches. Try Hatchery, or clear the search."
              : "Nothing in your pit matches. Add more dragons, or ignore search."}
          </p>
        ) : (
          <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.dragon.id}>
                <SuggestTile
                  suggestion={suggestion}
                  selected={slottedHere(suggestion.dragon.id) === selectedSlot}
                  kind={active.kind}
                  ignoreLevel={active.ignoreLevel}
                  rank={index + 1}
                  onPick={() => pick(suggestion.dragon.id)}
                  onInspect={() => setInspecting(suggestion.dragon)}
                  onSaveNotes={(ownedId, notes) =>
                    updateOwned(ownedId, { notes })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="col-span-full mt-3 space-y-2 lg:hidden">
        <TeamExtras
          isTheory={isTheory}
          lineup={lineup}
          embedded={embedded}
          report={report}
          onUpdate={(patch) => updateLineup(lineup.id, patch)}
          onCopy={copySummary}
          onDelete={() => {
            deleteLineup(lineup.id);
            router.push("/lineups");
          }}
          onSaved={() => router.push("/lineups")}
        />
      </div>

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

function TeamExtras({
  isTheory,
  lineup,
  embedded,
  report,
  onUpdate,
  onCopy,
  onDelete,
  onSaved,
}: {
  isTheory: boolean;
  lineup: Lineup;
  embedded?: boolean;
  report: SynergyReport;
  onUpdate: (patch: Partial<Lineup>) => void;
  onCopy: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="space-y-2">
      <Disclosure
        title="Options"
        badge={
          isTheory
            ? `Aim ★${lineup.craftStars}`
            : lineup.ignoreLevel
              ? "Ignore level"
              : "Use reign"
        }
      >
        {!isTheory ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <MiniChip
                active={!lineup.ignoreLevel}
                onClick={() => onUpdate({ ignoreLevel: false })}
              >
                Use reign level
              </MiniChip>
              <MiniChip
                active={lineup.ignoreLevel}
                onClick={() => onUpdate({ ignoreLevel: true })}
              >
                Ignore level
              </MiniChip>
            </div>
            <p className="text-xs text-muted-foreground">
              {lineup.ignoreLevel
                ? "Suggestions rank by stars and kit only. Reign is hidden."
                : "Higher reign ranks a dragon above an equal-star alternative."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground">
              AIM FOR STARS
            </p>
            <StarRank
              value={lineup.craftStars}
              onChange={(craftStars) => onUpdate({ craftStars })}
            />
            <p className="text-xs text-muted-foreground">
              New slots use ★{lineup.craftStars}. Change a slotted dragon
              without touching your pit.
            </p>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onCopy}>
            <Copy data-icon="inline-start" />
            Copy
          </Button>
          {!embedded ? (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          ) : (
            <Button variant="outline" onClick={onSaved}>
              Saved teams
            </Button>
          )}
        </div>
      </Disclosure>
      <Disclosure
        title="Why this team"
        badge={`${report.label} · ${report.score}`}
      >
        <SynergyPanel report={report} compact />
      </Disclosure>
    </div>
  );
}
