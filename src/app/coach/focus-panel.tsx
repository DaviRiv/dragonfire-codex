"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { DragonIcon } from "@/components/dragon-icon";
import {
  BreedChip,
  DragonBuffChips,
  DragonDamageChips,
  TroopWords,
} from "@/components/dragon-meta";
import { SearchField } from "@/components/search-field";
import { SectionLabel } from "@/components/section-label";
import { Button } from "@/components/ui/button";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { filterDragonPicks } from "@/lib/counter-pick";
import { TROOP_TYPES, slotShort, troopLabels } from "@/lib/labels";
import { SLOT_IDS } from "@/lib/lineup";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import type { Dragon, SlotId, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEAT_OPTIONS: { id: SlotId | "auto"; label: string }[] = [
  { id: "auto", label: "Best" },
  ...SLOT_IDS.map((slot) => ({ id: slot, label: slotShort[slot] })),
];

function Step({
  n,
  title,
  hint,
  action,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-semibold text-amber-100 ring-1 ring-amber-400/40"
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <SectionLabel as="h3" className="text-amber-50/90">
            {title}
          </SectionLabel>
          {hint ? (
            <p className="text-[11px] leading-snug text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  active,
  disabled,
  onClick,
  children,
  className,
  ...props
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
} & Record<`data-${string}`, string | undefined>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-lg px-2 text-[13px] font-medium ring-1 transition select-none disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-amber-500/25 text-amber-50 ring-amber-300"
          : "bg-black/20 text-foreground/80 ring-foreground/15 hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function FocusDragonCard({
  dragon,
  stars,
  seatedOn,
  onChange,
  onClear,
}: {
  dragon: Dragon;
  stars?: number;
  seatedOn?: string;
  onChange: () => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-xl bg-amber-500/10 p-2.5 ring-1 ring-amber-400/35">
      <div className="flex items-start gap-3">
        <DragonIcon
          dragonId={dragon.id}
          name={dragon.name}
          rarity={dragon.rarity}
          size="lg"
          selected
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="font-heading truncate text-base tracking-wide text-amber-50">
                {dragon.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {stars != null ? `In your pit · ★${stars}` : "Not in your pit"}
                {seatedOn ? ` · on ${seatedOn}` : ""}
              </p>
            </div>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Remove focus dragon"
              onClick={onClear}
            >
              <X />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-0.5">
            <BreedChip breed={dragon.breed} />
            <TroopWords troops={dragon.affinities} className="justify-start" />
            <DragonDamageChips dragon={dragon} className="justify-start" />
          </div>
          <DragonBuffChips dragon={dragon} max={4} className="justify-start" />
          <div className="flex flex-wrap gap-1">
            {dragonRoles(dragon).map((role) => (
              <span
                key={role}
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] ring-1",
                  roleChipClass[role],
                )}
              >
                {roleShort[role]}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 w-full"
        onClick={onChange}
      >
        Change dragon
      </Button>
    </div>
  );
}

function DragonPicker({
  selectedId,
  ownedStars,
  usedTeams,
  onPick,
  onCancel,
}: {
  selectedId: string | null;
  ownedStars: Map<string, number>;
  usedTeams: Map<string, string>;
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      filterDragonPicks(DRAGONS, { query, ownedIds: ownedStars.keys() }),
    [query, ownedStars],
  );
  const searching = query.trim().length > 0;
  const owned = searching ? [] : rows.filter((row) => ownedStars.has(row.id));
  const rest = owned.length
    ? rows.filter((row) => !ownedStars.has(row.id))
    : rows;

  function grid(list: Dragon[]) {
    return (
      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-3">
        {list.map((dragon) => {
          const selected = dragon.id === selectedId;
          const stars = ownedStars.get(dragon.id);
          const seatedOn = usedTeams.get(dragon.id);
          return (
            <li key={dragon.id}>
              <button
                type="button"
                onClick={() => onPick(dragon.id)}
                data-coach-pick={dragon.id}
                title={seatedOn ? `${dragon.name} · on ${seatedOn}` : dragon.name}
                className={cn(
                  "flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center transition",
                  selected
                    ? "bg-amber-500/20 ring-1 ring-amber-300"
                    : "hover:bg-muted",
                )}
              >
                <DragonIcon
                  dragonId={dragon.id}
                  name={dragon.name}
                  rarity={dragon.rarity}
                  size="sm"
                  selected={selected}
                  dimmed={Boolean(seatedOn)}
                />
                <span className="w-full truncate text-[11px]">
                  {dragon.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {seatedOn ? "Seated" : stars != null ? `★${stars}` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <SearchField
          value={query}
          onChange={setQuery}
          label="Search dragons"
          className="min-w-0 flex-1"
          inputClassName="h-10 md:h-9"
          autoFocus
        />
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto overscroll-contain rounded-xl bg-black/25 p-1.5 ring-1 ring-foreground/10">
        {rows.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No dragon matches “{query.trim()}”.
          </p>
        ) : owned.length > 0 ? (
          <>
            <p className="text-label px-1 pt-0.5">In your pit</p>
            {grid(owned)}
            {rest.length > 0 ? (
              <>
                <p className="text-label px-1 pt-1">Other dragons</p>
                {grid(rest)}
              </>
            ) : null}
          </>
        ) : (
          grid(rest)
        )}
      </div>
    </div>
  );
}

export function FocusPanel({
  dragonId,
  slot,
  troops,
  ownedStars,
  usedTeams,
  availablePitCount,
  generating,
  generated,
  dirty,
  onDragon,
  onSlot,
  onTroops,
  onGenerate,
  extra,
}: {
  dragonId: string | null;
  slot: SlotId | "auto";
  troops: TroopType[];
  ownedStars: Map<string, number>;
  usedTeams: Map<string, string>;
  availablePitCount: number;
  generating: boolean;
  generated: boolean;
  dirty: boolean;
  onDragon: (id: string | null) => void;
  onSlot: (slot: SlotId | "auto") => void;
  onTroops: (troops: TroopType[]) => void;
  onGenerate: () => void;
  extra?: ReactNode;
}) {
  const [picking, setPicking] = useState(false);
  const dragon = dragonId ? getCatalogDragon(dragonId) ?? null : null;
  const allOn = troops.length === TROOP_TYPES.length;
  const offAffinity =
    dragon && troops.every((troop) => !dragon.affinities.includes(troop));

  function toggleTroop(troop: TroopType) {
    const on = troops.includes(troop);
    if (on && troops.length === 1) return;
    onTroops(
      on ? troops.filter((item) => item !== troop) : [...troops, troop],
    );
  }

  const summary = [
    dragon ? dragon.name : "Any dragon",
    dragon ? (slot === "auto" ? "best seat" : slotShort[slot]) : null,
    allOn
      ? "any troop"
      : TROOP_TYPES.filter((troop) => troops.includes(troop))
          .map((troop) => troopLabels[troop])
          .join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  let n = 1;

  return (
    <aside
      aria-label="Build suggestions"
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl surface ring-1 ring-foreground/15"
    >
      <div className="min-h-0 flex-1 space-y-4 p-3 lg:overflow-y-auto">
        <div>
          <h2 className="font-heading text-base tracking-wide text-amber-50">
            Build suggestions
          </h2>
          <p className="text-xs text-muted-foreground">
            Choose what you want, then generate ranked three-dragon teams.
          </p>
        </div>

        <Step
          n={n++}
          title="Focus dragon"
          hint={
            dragon || picking
              ? undefined
              : "Optional — leave empty for the strongest team from your pit."
          }
        >
          {picking ? (
            <DragonPicker
              selectedId={dragonId}
              ownedStars={ownedStars}
              usedTeams={usedTeams}
              onPick={(id) => {
                onDragon(id);
                setPicking(false);
              }}
              onCancel={() => setPicking(false)}
            />
          ) : dragon ? (
            <FocusDragonCard
              dragon={dragon}
              stars={ownedStars.get(dragon.id)}
              seatedOn={usedTeams.get(dragon.id)}
              onChange={() => setPicking(true)}
              onClear={() => onDragon(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setPicking(true)}
              data-coach-choose-focus
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/25 px-3 text-sm text-muted-foreground transition hover:border-amber-300/60 hover:bg-amber-500/5 hover:text-amber-50"
            >
              <Plus className="size-4" aria-hidden />
              Choose a focus dragon
            </button>
          )}
        </Step>

        {dragon && !picking ? (
          <Step
            n={n++}
            title="Seat"
            hint={`Where ${dragon.name} sits in the march.`}
          >
            <div className="grid grid-cols-4 gap-1" role="group" aria-label="Seat">
              {SEAT_OPTIONS.map((option) => (
                <OptionButton
                  key={option.id}
                  active={slot === option.id}
                  onClick={() => onSlot(option.id)}
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          </Step>
        ) : null}

        <Step
          n={n++}
          title="Troops"
          hint="Pick one to lock it, or several to compare."
          action={
            <div className="flex shrink-0 gap-1">
              {dragon ? (
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 text-[11px] text-amber-200 hover:bg-muted hover:underline"
                  onClick={() => onTroops([...dragon.affinities])}
                >
                  Match {dragon.name}
                </button>
              ) : null}
              {!allOn ? (
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 text-[11px] text-amber-200 hover:bg-muted hover:underline"
                  onClick={() => onTroops([...TROOP_TYPES])}
                >
                  All
                </button>
              ) : null}
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3" role="group" aria-label="Troops">
            {TROOP_TYPES.map((troop) => {
              const affinity = dragon?.affinities.includes(troop);
              return (
                <OptionButton
                  key={troop}
                  active={troops.includes(troop)}
                  onClick={() => toggleTroop(troop)}
                  data-coach-troop={troop}
                  className="flex items-center justify-center gap-1.5"
                >
                  {troopLabels[troop]}
                  {affinity ? (
                    <span
                      className="size-1.5 rounded-full bg-emerald-400"
                      title={`${dragon?.name} affinity`}
                    />
                  ) : null}
                </OptionButton>
              );
            })}
          </div>
          {dragon ? (
            <p className="text-[11px] text-muted-foreground">
              <span className="me-1 inline-block size-1.5 rounded-full bg-emerald-400 align-middle" />
              {dragon.name} affinity (+20% troop stats)
            </p>
          ) : null}
          {offAffinity ? (
            <p className="rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100 ring-1 ring-amber-400/30">
              {dragon?.name} has no affinity for these troops, so teams miss the
              +20% troop bonus.
            </p>
          ) : null}
        </Step>

        {extra}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border/60 bg-black/30 p-3">
        <p className="truncate text-[11px] text-muted-foreground" title={summary}>
          {summary}
        </p>
        <Button
          type="button"
          className="h-11 w-full text-sm"
          onClick={onGenerate}
          disabled={generating}
          data-coach-generate
        >
          {generating ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Sparkles data-icon="inline-start" />
          )}
          {generating
            ? "Generating…"
            : generated && dirty
              ? "Update suggestions"
              : "Generate suggestions"}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Uses your {availablePitCount} free pit dragon
          {availablePitCount === 1 ? "" : "s"} first, then every dragon if
          needed.
        </p>
      </div>
    </aside>
  );
}