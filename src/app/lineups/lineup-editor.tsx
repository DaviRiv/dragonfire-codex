"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { DragonSheet } from "@/components/dragon-sheet";
import { FormationBoard } from "@/components/formation-board";
import { PairingPanel } from "@/components/pairing-panel";
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
  slotHints,
} from "@/lib/labels";
import {
  COMP_ROLES,
  roleLabels,
  type CompRole,
} from "@/lib/roles";
import { vanguardBonus } from "@/lib/habits";
import { suggestDragons, suggestFullLine } from "@/lib/suggest";
import { usePit } from "@/lib/store";
import type { Dragon, Lineup, SlotId } from "@/lib/types";
import { pairingReport } from "@/lib/pairing";
import { analyzeLineup, summarizeLineup, type SynergyReport } from "@/lib/synergy";
import { Copy, Search, Sparkles, Trash2 } from "lucide-react";

type TheoryPool = "all" | "owned" | "unowned";
type RoleFilter = CompRole | "all";

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
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [inspecting, setInspecting] = useState<Dragon | null>(null);
  const [showAbilities, setShowAbilities] = useState(false);
  const pickRef = useRef<HTMLElement>(null);

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
    setRoleFilter("all");
  }

  const report = useMemo(
    () => (lineup ? analyzeLineup(lineup, state) : null),
    [lineup, state],
  );
  const pairing = useMemo(
    () => (lineup ? pairingReport(lineup, state) : null),
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
      role: roleFilter,
    });
  }, [lineup, selectedSlot, state, query, theoryPool, roleFilter]);

  if (!ready || !lineup || !report || !pairing) {
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
          : "Every lane is filled, or your pit has no more dragons for this team.",
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

  const pitEmpty = !isTheory && state.owned.length === 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(24rem,38rem)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="space-y-2 lg:sticky lg:top-[calc(3.5rem+env(safe-area-inset-top))]">
        <FormationBoard
          lineup={lineup}
          state={state}
          selectedSlot={selectedSlot}
          onSelectSlot={(slot) => {
            setSelectedSlot(slot);
            if (window.matchMedia("(max-width: 1023px)").matches) {
              pickRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          }}
          onClearSlot={(slot) => setSlot(lineup.id, slot, null)}
          onNameChange={(name) => updateLineup(lineup.id, { name })}
        />

        {isTheory && selectedResolved ? (
          <div className="rounded-xl bg-card/70 p-2 ring-1 ring-foreground/10">
            <p className="text-label mb-1">
              Stars · {selectedDragon?.name}
            </p>
            <StarRank
              value={selectedResolved.starRank}
              onChange={(starRank) =>
                updateSlotPick(active.id, selectedSlot, { starRank })
              }
            />
          </div>
        ) : null}

        {isTheory ? <PairingPanel report={pairing} /> : null}

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

      <section
        ref={pickRef}
        className="mt-3 min-w-0 scroll-mt-[4.25rem] space-y-2 lg:mt-0"
      >
        <div className="flex items-center gap-2">
          <h2 className="font-heading min-w-0 flex-1 truncate text-base tracking-wide sm:text-lg">
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
            Suggest
          </Button>
        </div>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {pitEmpty
            ? "Log dragons in the pit to rank a team."
            : roleFilter === "all"
              ? `${suggestions.length} for ${slotShort[selectedSlot].toLowerCase()}. Already slotted are hidden.`
              : `${suggestions.length} ${roleLabels[roleFilter].toLowerCase()} for ${slotShort[selectedSlot].toLowerCase()}.`}
        </p>
        {selectedSlot === "vanguard" ? (
          <p
            className="line-clamp-2 rounded-lg bg-emerald-950/40 px-2.5 py-2 text-[13px] leading-snug text-emerald-50 ring-1 ring-emerald-500/25"
            title={
              selectedDragon
                ? `${selectedDragon.name}: ${vanguardBonus(selectedDragon, true)}`
                : slotHints.vanguard
            }
          >
            <span className="font-heading tracking-wide text-emerald-200">
              Vanguard
            </span>
            {" · "}
            {selectedDragon
              ? `${selectedDragon.name}: ${vanguardBonus(selectedDragon, true)}`
              : slotHints.vanguard}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-2xl bg-card/70 ring-1 ring-foreground/10">
          <div className="space-y-2 border-b border-border/50 p-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={
                    isTheory ? "Search hatchery…" : "Search your pit…"
                  }
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  enterKeyHint="search"
                  className="pl-9"
                />
              </div>
              <MiniChip
                active={showAbilities}
                onClick={() => setShowAbilities((value) => !value)}
                className="shrink-0"
              >
                Abilities
              </MiniChip>
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
              <MiniChip
                active={roleFilter === "all"}
                onClick={() => setRoleFilter("all")}
              >
                All
              </MiniChip>
              {COMP_ROLES.map((role) => (
                <MiniChip
                  key={role}
                  active={roleFilter === role}
                  onClick={() =>
                    setRoleFilter((current) =>
                      current === role ? "all" : role,
                    )
                  }
                >
                  {roleLabels[role]}
                </MiniChip>
              ))}
            </div>
            {isTheory ? (
              <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
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
            <p className="text-[13px] leading-snug text-muted-foreground">
              {roleFilter === "all"
                ? "Healer, tank, damage, and crowd control — same jobs as a dungeon group. Troop and mode live under Options."
                : roleFilter === "healing"
                  ? "Ally Recovery, with the star gate on the line. A red warning on the ★ means your pit is short of that rank — the kit is a goal, not live."
                  : roleFilter === "tanking"
                    ? "Taunt soaks, like Vhagar. They stay out of Damage so this list is the front line."
                    : roleFilter === "damage"
                      ? "Damage dealers, like Venator and Kalspire. Tanks are listed under Tanking instead."
                      : "Hard crowd control — Stun, Panic, Slow, Stagger, Confusion. Kalspire is here and under Damage."}
            </p>
          </div>

        {pitEmpty ? (
          <EmptyState
            title="Add your dragons first"
            description="Log hatched dragons in the pit, then come back and pick a team. Suggest team ranks what you own."
            className="rounded-none border-0"
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
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {isTheory
              ? roleFilter === "all"
                ? "Nothing matches. Try Hatchery, or clear the search."
                : `No ${roleLabels[roleFilter].toLowerCase()} matches. Try All, or clear the search.`
              : query.trim() || roleFilter !== "all"
                ? roleFilter === "all"
                  ? "Nothing in your pit matches. Clear the search."
                  : `No ${roleLabels[roleFilter].toLowerCase()} in your pit matches. Try All, or clear the search.`
                : "Everyone in your pit is already on this team. Clear a lane to see other picks."}
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
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
                  slot={selectedSlot}
                  showAbilities={showAbilities}
                />
              </li>
            ))}
          </ul>
        )}
        </div>
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
        starRank={
          inspecting
            ? (["left", "vanguard", "right"] as SlotId[])
                .map((slot) => resolveSlot(active, state, slot))
                .find((row) => row?.dragon.id === inspecting.id)?.starRank ??
              (isTheory
                ? active.craftStars
                : (state.owned.find((row) => row.dragonId === inspecting.id)
                    ?.starRank ?? 1))
            : 1
        }
        reignLevel={
          inspecting
            ? (["left", "vanguard", "right"] as SlotId[])
                .map((slot) => resolveSlot(active, state, slot))
                .find((row) => row?.dragon.id === inspecting.id)?.reignLevel ??
              (state.owned.find((row) => row.dragonId === inspecting.id)
                ?.reignLevel ?? 1)
            : 1
        }
        ownedStars={
          inspecting
            ? (state.owned.find((row) => row.dragonId === inspecting.id)
                ?.starRank ?? null)
            : null
        }
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
  const counter = troopCounters[lineup.troop];
  return (
    <div className="space-y-2">
      <Disclosure
        title="Options"
        badge={`${troopShort[lineup.troop]} · ${modeShort[lineup.mode]}`}
      >
        <div className="mb-3 space-y-2">
          <p className="text-label">March troop</p>
          <div className="flex flex-wrap gap-1">
            {TROOP_TYPES.map((troop) => (
              <MiniChip
                key={troop}
                active={lineup.troop === troop}
                onClick={() => onUpdate({ troop })}
              >
                {troopShort[troop]}
              </MiniChip>
            ))}
          </div>
          <p className="text-label">Mode</p>
          <div className="flex flex-wrap gap-1">
            {MODES.map((mode) => (
              <MiniChip
                key={mode}
                active={lineup.mode === mode}
                onClick={() => onUpdate({ mode })}
              >
                {modeShort[mode]}
              </MiniChip>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {counter.beats
              ? `${troopLabels[lineup.troop]} beat ${troopLabels[counter.beats]}${
                  counter.losesTo
                    ? `, lose to ${troopLabels[counter.losesTo]}`
                    : ""
                }. Ranking still favors this troop.`
              : counter.note}
          </p>
        </div>
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
            <p className="text-label">Aim for stars</p>
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
