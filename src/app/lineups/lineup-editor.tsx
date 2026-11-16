"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChatGptAsk } from "@/components/ai-suggest";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { DragonSheet } from "@/components/dragon-sheet";
import { ChipRow } from "@/components/filter-bar";
import { FormationBoard } from "@/components/formation-board";
import { GameFacts } from "@/components/game-facts";
import { PairingPanel } from "@/components/pairing-panel";
import { EmptyState } from "@/components/empty-state";
import { SearchField } from "@/components/search-field";
import { StarRank } from "@/components/star-rank";
import { SuggestTile } from "@/components/suggest-tile";
import { SynergyPanel } from "@/components/synergy-panel";
import { Button } from "@/components/ui/button";
import {
  dragonsUsedOnOtherPitTeams,
  filledCount,
  placedInLineup,
  resolveSlot,
  skipsUsedDragons,
  slotOfDragon,
} from "@/lib/lineup";
import { lineGapHeadline } from "@/lib/comp";
import { slotShort, slotHints } from "@/lib/labels";
import {
  COMP_ROLES,
  roleLabels,
  type CompRole,
} from "@/lib/roles";
import { vanguardBonus, liveOwnedHabits } from "@/lib/habits";
import { suggestDragons, suggestFullLine } from "@/lib/suggest";
import { usePit } from "@/lib/store";
import type { Dragon, Lineup, PitState, SlotId } from "@/lib/types";
import { pairingReport } from "@/lib/pairing";
import { analyzeLineup, summarizeLineup, type SynergyReport } from "@/lib/synergy";
import { Copy, Sparkles, Trash2 } from "lucide-react";

type TheoryPool = "all" | "owned" | "unowned";
type RoleFilter = CompRole | "all";

export function LineupEditor({
  lineupId,
  embedded,
  onOpenLineup,
  belowFormation,
}: {
  lineupId: string;
  embedded?: boolean;
  onOpenLineup?: (id: string) => void;
  belowFormation?: ReactNode;
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
    createLineup,
    setDragonHabitRank,
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

  const leftoverIds = useMemo(
    () =>
      lineup && skipsUsedDragons(lineup)
        ? dragonsUsedOnOtherPitTeams(state, lineup.id)
        : undefined,
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
      excludeIds: leftoverIds,
    });
  }, [lineup, selectedSlot, state, query, theoryPool, roleFilter, leftoverIds]);

  const gapHeadline = useMemo(() => {
    if (!lineup) return null;
    const mates = placedInLineup(lineup, state).filter(
      (row) => row.slot !== selectedSlot,
    );
    return lineGapHeadline(
      mates.map((row) => ({
        dragon: row.dragon,
        atStars: row.starRank,
        habits: liveOwnedHabits(row.owned, lineup.kind),
      })),
    );
  }, [lineup, state, selectedSlot]);

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
    const excludeIds = skipsUsedDragons(active)
      ? dragonsUsedOnOtherPitTeams(state, active.id)
      : undefined;
    const picks = suggestFullLine(active, state, {
      replace: filled === 3,
      excludeIds,
    });
    if (picks.length === 0) {
      toast(
        isTheory
          ? "Every lane is already filled."
          : skipsUsedDragons(active)
            ? "No pit dragons left that are not already on another saved team."
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

  function nextArmy() {
    const pitCount = state.lineups.filter((row) => row.kind === "pit").length;
    const created = createLineup(`Lineup ${pitCount + 1}`, "pit");
    updateLineup(created.id, {
      troop: active.troop,
      mode: active.mode,
      excludeUsed: true,
    });
    const draft = {
      ...created,
      troop: active.troop,
      mode: active.mode,
      excludeUsed: true as const,
    };
    const excludeIds = dragonsUsedOnOtherPitTeams(state, created.id);
    const picks = suggestFullLine(draft, state, { excludeIds });
    if (picks.length > 0) {
      slotDragons(
        created.id,
        picks.map((p) => ({ slot: p.slot, dragonId: p.dragon.id })),
      );
      toast.success(
        `Next army from leftovers: ${picks.map((p) => p.dragon.name).join(", ")}.`,
      );
    } else {
      toast(
        "Opened an empty team. Add pit dragons, or turn off skipping other saved teams.",
      );
    }
    if (onOpenLineup) onOpenLineup(created.id);
    else router.push(`/lineups/${created.id}`);
  }

  async function copySummary() {
    const text = summarizeLineup(active, state);
    await navigator.clipboard.writeText(text);
    toast.success("Copied lineup summary.");
  }

  const pitEmpty = !isTheory && state.owned.length === 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(20rem,28rem)_minmax(24rem,1fr)] lg:items-start lg:gap-4 xl:grid-cols-[minmax(22rem,30rem)_minmax(28rem,1fr)]">
      <div className="space-y-2">
        <FormationBoard
          lineup={lineup}
          state={state}
          selectedSlot={selectedSlot}
          buffs={pairing?.buffs}
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
          onTroopChange={(troop) => updateLineup(lineup.id, { troop })}
          onModeChange={(mode) => updateLineup(lineup.id, { mode })}
        />

        {isTheory && selectedResolved ? (
          <div className="rounded-xl surface p-2 ring-1 ring-foreground/10">
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
        ) : isTheory ? (
          <div className="rounded-xl surface p-2 ring-1 ring-foreground/10">
            <p className="text-label mb-1">Aim for stars</p>
            <StarRank
              value={lineup.craftStars}
              onChange={(craftStars) => updateLineup(lineup.id, { craftStars })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              New slots use ★{lineup.craftStars}. Unowned kit here is a goal,
              not a march.
            </p>
          </div>
        ) : null}

        {pairing ? <PairingPanel report={pairing} /> : null}

        {belowFormation}

        <div className="hidden space-y-2 lg:block">
          <TeamExtras
            lineup={active}
            state={state}
            embedded={embedded}
            report={report}
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
        className="mt-3 min-w-0 scroll-mt-[4.25rem] lg:sticky lg:top-[calc(3.5rem+env(safe-area-inset-top))] lg:mt-0 lg:flex lg:max-h-[calc(100dvh-5.25rem)] lg:flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl surface ring-1 ring-amber-400/25">
          <div className="space-y-2 border-b border-border/50 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading min-w-0 flex-1 truncate text-base tracking-wide sm:text-lg">
                {selectedDragon
                  ? `Replace ${selectedDragon.name}`
                  : `Pick list · ${slotShort[selectedSlot]}`}
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={!selectedDragon}
                onClick={() => {
                  if (selectedDragon) setInspecting(selectedDragon);
                }}
              >
                Full stats
              </Button>
              <Button
                size="sm"
                onClick={fillLine}
                className="shrink-0"
                disabled={pitEmpty}
              >
                <Sparkles data-icon="inline-start" />
                Suggest
              </Button>
              {!isTheory && !pitEmpty ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={nextArmy}
                  className="shrink-0"
                >
                  Next army
                </Button>
              ) : null}
            </div>
            <p className="text-[13px] leading-snug text-muted-foreground">
              {pitEmpty
                ? "Mark owned dragons in the pit to rank a team."
                : isTheory
                  ? roleFilter === "all"
                    ? `${suggestions.length} for ${slotShort[selectedSlot].toLowerCase()}. Already slotted are hidden. Unowned rows are goals, not a march.`
                    : `${suggestions.length} ${roleLabels[roleFilter].toLowerCase()} for ${slotShort[selectedSlot].toLowerCase()}.`
                  : skipsUsedDragons(active)
                    ? `${suggestions.length} in your pit for ${slotShort[selectedSlot].toLowerCase()}, skipping dragons already on another saved team.`
                    : `${suggestions.length} in your pit for ${slotShort[selectedSlot].toLowerCase()}. Suggest never seats a dragon you do not own.`}
            </p>
            {!isTheory && !pitEmpty ? (
              <div className="flex flex-wrap gap-1">
                <MiniChip
                  active={skipsUsedDragons(active)}
                  onClick={() => updateLineup(active.id, { excludeUsed: true })}
                >
                  Skip other teams
                </MiniChip>
                <MiniChip
                  active={!skipsUsedDragons(active)}
                  onClick={() => updateLineup(active.id, { excludeUsed: false })}
                >
                  Allow reuse
                </MiniChip>
              </div>
            ) : null}
            {gapHeadline ? (
              <p className="rounded-xl bg-[#3a1210] px-2.5 py-2 text-[13px] leading-snug text-red-50 ring-1 ring-[#c34a2c]/70">
                {gapHeadline}
              </p>
            ) : null}
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
            <div className="flex min-w-0 items-center gap-1.5">
              <SearchField
                value={query}
                onChange={setQuery}
                label={isTheory ? "Search the pit" : "Search your pit"}
                inputClassName="h-11 md:h-9"
              />
              <MiniChip
                active={showAbilities}
                onClick={() => setShowAbilities((value) => !value)}
                className="shrink-0"
              >
                Abilities
              </MiniChip>
            </div>
            <ChipRow label="Job">
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
            </ChipRow>
            {isTheory ? (
              <ChipRow label="Ownership">
                {(
                  [
                    ["all", "All dragons"],
                    ["unowned", "Not owned"],
                    ["owned", "Owned"],
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
              </ChipRow>
            ) : null}
            <p className="text-[13px] leading-snug text-muted-foreground">
              {roleFilter === "all"
                ? "Healer, tank, damage, and crowd control — same jobs as a dungeon group."
                : roleFilter === "healing"
                  ? "Ally Recovery, with the star gate on the line. A red warning on the ★ means your pit is short of that rank — the kit is a goal, not live."
                  : roleFilter === "tanking"
                    ? "Taunt soaks, like Vhagar. They stay out of Damage so this list is the front line."
                    : roleFilter === "damage"
                      ? "Damage dealers, like Venator and Kalspire. Tanks are listed under Tanking instead."
                      : "Hard crowd control — Stun, Panic, Slow, Stagger, Confusion. Kalspire is here and under Damage."}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {pitEmpty ? (
              <EmptyState
                title="Add your dragons first"
                description="Log hatched dragons in the pit, then come back and pick a team. Suggest team ranks what you own."
                className="rounded-none border-0"
                action={
                  <div className="grid w-full max-w-sm gap-2">
                    <Button onClick={loadSample}>Load sample pit</Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/pit")}
                    >
                      Open pit
                    </Button>
                  </div>
                }
              />
            ) : suggestions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {isTheory
                  ? roleFilter === "all"
                    ? "Nothing matches. Try All dragons, or clear the search."
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
                      selected={
                        slottedHere(suggestion.dragon.id) === selectedSlot
                      }
                      kind={active.kind}
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
        </div>
      </section>

      <div className="col-span-full mt-3 space-y-2 lg:hidden">
        <TeamExtras
          lineup={active}
          state={state}
          embedded={embedded}
          report={report}
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
          // Theory lines are wish-lists, so they stay at the base level.
          inspecting && !isTheory
            ? state.owned.find((row) => row.dragonId === inspecting.id)
                ?.reignLevel
            : undefined
        }
        ownedStars={
          inspecting
            ? (state.owned.find((row) => row.dragonId === inspecting.id)
                ?.starRank ?? null)
            : null
        }
        ownedHabits={
          inspecting && !isTheory
            ? state.owned.find((row) => row.dragonId === inspecting.id)?.habits
            : undefined
        }
        ownedHabitRanks={
          inspecting
            ? state.owned.find((row) => row.dragonId === inspecting.id)
                ?.habitRanks
            : undefined
        }
        onHabitRankChange={
          inspecting &&
          state.owned.some((row) => row.dragonId === inspecting.id)
            ? (habit, rank) => setDragonHabitRank(inspecting.id, habit, rank)
            : undefined
        }
        synergyBuffs={
          inspecting
            ? (pairing?.buffs.filter((buff) => buff.dragonId === inspecting.id) ??
              [])
            : []
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
  lineup,
  state,
  embedded,
  report,
  onCopy,
  onDelete,
  onSaved,
}: {
  lineup: Lineup;
  state: PitState;
  embedded?: boolean;
  report: SynergyReport;
  onCopy: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="space-y-2">
      <GameFacts />
      <ChatGptAsk key={lineup.id} lineup={lineup} state={state} />
      <Disclosure
        title="Why this team"
        badge={`${report.label} · ${report.score}`}
      >
        <SynergyPanel report={report} compact />
      </Disclosure>
      <div className="grid grid-cols-2 gap-2">
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
    </div>
  );
}
