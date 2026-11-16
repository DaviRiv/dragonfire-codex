"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { MiniChip } from "@/components/chip";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonSheet } from "@/components/dragon-sheet";
import { ChipRow, NoMatches } from "@/components/filter-bar";
import { SearchField } from "@/components/search-field";
import { SectionLabel } from "@/components/section-label";
import {
  HabitPickerDialog,
  HabitSearchButton,
} from "@/components/habit-picker";
import { StarRank, StarStepper } from "@/components/star-rank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TroopIcon, TroopIcons } from "@/components/troop-icon";
import { DRAGON_HABITS } from "@/data/dragon-habits";
import { allDragons, lineupsUsingDragon } from "@/lib/dragons";
import {
  BREEDS,
  RARITIES,
  TROOP_TYPES,
  breedLabels,
  rarityLabels,
  troopLabels,
} from "@/lib/labels";
import {
  COMP_ROLES,
  type CompRole,
  dragonRoles,
  hasCompRole,
  roleChipClass,
  roleShort,
} from "@/lib/roles";
import { REIGN_MAX, REIGN_MIN, clampReign } from "@/lib/lineup";
import { exportPit, isPitState, usePit } from "@/lib/store";
import type {
  Breed,
  Dragon,
  OwnedDragon,
  Rarity,
  TroopType,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Download,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

type Ownership = "all" | "owned" | "missing";

export function PitPage() {
  const {
    ready,
    state,
    setCatalogOwned,
    setDragonHabits,
    setDragonHabitRank,
    updateOwned,
    loadSample,
    resetPit,
    importState,
  } = usePit();
  const [inspecting, setInspecting] = useState<Dragon | null>(null);
  const [habitDragon, setHabitDragon] = useState<Dragon | null>(null);
  const [unlistedOpen, setUnlistedOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ownership, setOwnership] = useState<Ownership>("all");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [breed, setBreed] = useState<Breed | "all">("all");
  const [troop, setTroop] = useState<TroopType | "all">("all");
  const [role, setRole] = useState<CompRole | "all">("all");
  const [facetsOpen, setFacetsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ownedById = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row] as const)),
    [state.owned],
  );
  // Unlisted dragons the player added are owned too, so they belong in the
  // grid — otherwise there is no way to re-rank or release them.
  const catalog = useMemo(
    () => allDragons(state.customDragons),
    [state.customDragons],
  );

  /*
   * Search covers the kit, not just the name, so "bulwark" or "archers" finds
   * the dragons that actually do that — the question a player is usually
   * asking. Every term is read off the catalog, so the index cannot claim an
   * ability a dragon does not have.
   */
  const haystacks = useMemo(() => {
    const index = new Map<string, string>();
    for (const dragon of catalog) {
      index.set(
        dragon.id,
        [
          dragon.name,
          dragon.epithet,
          breedLabels[dragon.breed],
          rarityLabels[dragon.rarity],
          ...dragon.affinities.map((type) => troopLabels[type]),
          ...dragon.tags,
          ...(dragon.provides ?? []).map((entry) => entry.ability),
          ...dragonRoles(dragon).map((comp) => roleShort[comp]),
          dragon.command,
          dragon.habit,
          ...(DRAGON_HABITS[dragon.id] ?? []).map((row) => row.level1),
        ]
          .join(" ")
          .toLowerCase(),
      );
    }
    return index;
  }, [catalog]);

  const facetCount =
    (rarity === "all" ? 0 : 1) +
    (breed === "all" ? 0 : 1) +
    (troop === "all" ? 0 : 1) +
    (role === "all" ? 0 : 1);
  const filtering =
    facetCount > 0 || ownership !== "all" || query.trim() !== "";

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((dragon) => {
      if (needle && !(haystacks.get(dragon.id) ?? "").includes(needle)) {
        return false;
      }
      const stars = ownedById.get(dragon.id)?.starRank ?? 0;
      if (ownership === "owned" && stars <= 0) return false;
      if (ownership === "missing" && stars > 0) return false;
      if (rarity !== "all" && dragon.rarity !== rarity) return false;
      if (breed !== "all" && dragon.breed !== breed) return false;
      if (troop !== "all" && !dragon.affinities.includes(troop)) return false;
      if (role !== "all" && !hasCompRole(dragon, role)) return false;
      return true;
    });
  }, [
    catalog,
    haystacks,
    ownedById,
    query,
    ownership,
    rarity,
    breed,
    troop,
    role,
  ]);

  function clearFilters() {
    setQuery("");
    setOwnership("all");
    setRarity("all");
    setBreed("all");
    setTroop("all");
    setRole("all");
  }

  if (!ready) {
    return <p className="text-ui text-muted-foreground">Opening the pit…</p>;
  }

  const inspectingOwned = inspecting
    ? (ownedById.get(inspecting.id) ?? null)
    : null;
  const habitOwned = habitDragon
    ? (ownedById.get(habitDragon.id) ?? null)
    : null;
  const inspectingTeams = inspectingOwned
    ? lineupsUsingDragon(state, inspectingOwned.id)
    : [];

  function setStars(dragon: Dragon, starRank: number) {
    const next = Math.max(0, Math.min(10, Math.round(starRank) || 0));
    if (next <= 0) {
      const row = ownedById.get(dragon.id);
      if (row) {
        const used = lineupsUsingDragon(state, row.id);
        if (
          used.length > 0 &&
          !window.confirm(
            `${dragon.name} sits on ${used.length} saved team${used.length === 1 ? "" : "s"}. Clear stars anyway?`,
          )
        ) {
          return;
        }
      }
      setCatalogOwned(dragon.id, { owned: false });
      return;
    }
    setCatalogOwned(dragon.id, { owned: true, starRank: next });
  }

  return (
    <div className="-mx-3 -mt-3 min-h-[calc(100dvh-3rem-env(safe-area-inset-top))] sm:-mx-4 sm:-mt-6 md:min-h-[calc(100dvh-3.5rem)]">
      <h1 className="sr-only">Your pit</h1>
      {/* Export / Import / Clear are maintenance, so they shrink to icons on a
          phone instead of wrapping the row three deep above the grid. */}
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
        <p className="text-label text-num mr-auto">
          {state.owned.length} of {catalog.length} owned
        </p>
        {state.owned.length === 0 ? (
          <Button size="sm" variant="secondary" onClick={loadSample}>
            Sample
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setUnlistedOpen(true)}
        >
          <Plus data-icon="inline-start" />
          Unlisted
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportPit(state)}
          title="Export your pit to a file"
        >
          <Download data-icon="inline-start" />
          <span className="sr-only sm:not-sr-only">Export</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          title="Import a pit export file"
        >
          <Upload data-icon="inline-start" />
          <span className="sr-only sm:not-sr-only">Import</span>
        </Button>
        <Button
          size="sm"
          variant="destructive"
          title="Clear this browser’s saved pit"
          onClick={() => {
            if (
              window.confirm("Clear this browser’s pit, lineups, and teams?")
            ) {
              resetPit();
            }
          }}
        >
          <Trash2 data-icon="inline-start" />
          <span className="sr-only sm:not-sr-only">Clear</span>
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            try {
              const parsed: unknown = JSON.parse(await file.text());
              if (!isPitState(parsed)) {
                toast.error("That file is not a Dragonfire pit export.");
                return;
              }
              importState(parsed);
            } catch {
              toast.error("Could not read that file.");
            }
          }}
        />
      </div>

      {/* Sticky, but offset by the site header: at top-0 it parks underneath
          the header and both the search and the chips become unclickable. */}
      <section
        aria-labelledby="pit-filters"
        className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 space-y-1.5 border-b border-border/60 bg-background/95 px-2 pt-1 pb-2 backdrop-blur sm:top-[calc(3.5rem+env(safe-area-inset-top))] supports-[backdrop-filter]:bg-background/80"
      >
        <SectionLabel id="pit-filters" className="sr-only">
          Find a dragon
        </SectionLabel>
        <div className="flex items-center gap-1.5">
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search dragons by name, troop, or ability"
            inputClassName="h-11 md:h-9"
          />
          <MiniChip
            active={facetsOpen || facetCount > 0}
            onClick={() => setFacetsOpen((open) => !open)}
            aria-expanded={facetsOpen}
            className="shrink-0 gap-1"
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
            <span className="sr-only sm:not-sr-only">Filters</span>
            {facetCount > 0 ? (
              <span className="text-num">{facetCount}</span>
            ) : null}
          </MiniChip>
        </div>
        <div className="flex items-center gap-1.5">
          <ChipRow label="Ownership" className="flex-1">
            {(
              [
                ["all", "All"],
                ["owned", "Owned"],
                ["missing", "Missing"],
              ] as const
            ).map(([id, label]) => (
              <MiniChip
                key={id}
                active={ownership === id}
                onClick={() => setOwnership(id)}
              >
                {label}
              </MiniChip>
            ))}
          </ChipRow>
          <p className="text-label text-num shrink-0" aria-live="polite">
            {filtering
              ? `${visible.length} shown`
              : `${catalog.length} dragons`}
          </p>
        </div>
        {facetsOpen ? (
          <div className="space-y-1.5 pt-0.5">
            <FacetRow label="Rarity">
              <MiniChip
                active={rarity === "all"}
                onClick={() => setRarity("all")}
              >
                Any
              </MiniChip>
              {RARITIES.map((value) => (
                <MiniChip
                  key={value}
                  active={rarity === value}
                  onClick={() =>
                    setRarity((current) => (current === value ? "all" : value))
                  }
                >
                  {rarityLabels[value]}
                </MiniChip>
              ))}
            </FacetRow>
            <FacetRow label="Job">
              <MiniChip active={role === "all"} onClick={() => setRole("all")}>
                Any
              </MiniChip>
              {COMP_ROLES.map((value) => (
                <MiniChip
                  key={value}
                  active={role === value}
                  onClick={() =>
                    setRole((current) => (current === value ? "all" : value))
                  }
                >
                  {roleShort[value]}
                </MiniChip>
              ))}
            </FacetRow>
            <FacetRow label="Troop affinity">
              <MiniChip
                active={troop === "all"}
                onClick={() => setTroop("all")}
              >
                Any
              </MiniChip>
              {TROOP_TYPES.map((value) => (
                <MiniChip
                  key={value}
                  active={troop === value}
                  onClick={() =>
                    setTroop((current) => (current === value ? "all" : value))
                  }
                  className="gap-1"
                  title={troopLabels[value]}
                >
                  <TroopIcon troop={value} className="size-3.5" />
                  <span className="sr-only md:not-sr-only">
                    {troopLabels[value]}
                  </span>
                </MiniChip>
              ))}
            </FacetRow>
            <FacetRow label="Breed">
              <MiniChip
                active={breed === "all"}
                onClick={() => setBreed("all")}
              >
                Any
              </MiniChip>
              {BREEDS.map((value) => (
                <MiniChip
                  key={value}
                  active={breed === value}
                  onClick={() =>
                    setBreed((current) => (current === value ? "all" : value))
                  }
                >
                  {breedLabels[value]}
                </MiniChip>
              ))}
            </FacetRow>
            {filtering ? (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-10 text-ui-sm text-amber-200 underline-offset-2 hover:underline"
              >
                Clear all filters
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
      {visible.length === 0 ? (
        <div className="p-3">
          <NoMatches onClear={clearFilters}>
            {ownership === "missing"
              ? "You already own every dragon that matches."
              : "No dragons match this search."}
          </NoMatches>
        </div>
      ) : null}
      <SectionLabel className="sr-only">Dragon catalog</SectionLabel>
      {/* Each dragon gets a card. Loose in the grid, one dragon's + sat flush
          against the next dragon's −, with nothing to say which was which. */}
      <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {visible.map((dragon) => {
          const owned = ownedById.get(dragon.id);
          const stars = owned?.starRank ?? 0;
          return (
            <div
              key={dragon.id}
              className={cn(
                "surface surface-interactive flex flex-col items-center gap-1 rounded-xl px-1 pt-1 pb-1.5 ring-1",
                stars > 0 ? "ring-amber-400/25" : "ring-foreground/10",
              )}
            >
              {/* The name owns the full card width. Sharing the line with the
                  kit button cost it a third of the card and truncated most
                  names at eight columns; the button is a badge on the portrait
                  now, which is empty space either way. */}
              <p
                className={cn(
                  "font-heading w-full truncate text-center text-[11px] tracking-wide uppercase sm:text-xs",
                  stars > 0 ? "text-amber-50" : "text-muted-foreground",
                )}
                title={dragon.name}
              >
                {dragon.name}
              </p>
              <div className="relative">
                <DragonIcon
                  dragonId={dragon.id}
                  name={dragon.name}
                  rarity={dragon.rarity}
                  custom={dragon.custom}
                  size="xl"
                  dimmed={stars <= 0}
                  onClick={() => setInspecting(dragon)}
                />
                <HabitSearchButton
                  name={dragon.name}
                  onClick={() => setHabitDragon(dragon)}
                  className="absolute -right-1 bottom-0 bg-background/85 backdrop-blur-sm"
                />
              </div>
              <StarStepper
                size="sm"
                value={stars}
                onDelta={(delta) => setStars(dragon, stars + delta)}
              />
            </div>
          );
        })}
      </div>
      <DragonSheet
        dragon={inspecting}
        open={!!inspecting}
        onOpenChange={(next) => {
          if (!next) setInspecting(null);
        }}
        starRank={inspectingOwned?.starRank}
        reignLevel={inspectingOwned?.reignLevel}
        ownedStars={inspectingOwned?.starRank ?? null}
        ownedHabits={inspectingOwned?.habits}
        ownedHabitRanks={inspectingOwned?.habitRanks}
        onHabitRankChange={
          inspecting
            ? (habit, rank) => setDragonHabitRank(inspecting.id, habit, rank)
            : undefined
        }
        extra={
          inspecting ? (
            <div className="space-y-3">
              <div>
                <p className="text-label mb-1">Star rank</p>
                <StarRank
                  value={inspectingOwned?.starRank ?? 0}
                  onChange={(starRank) => setStars(inspecting, starRank)}
                />
              </div>
              {inspectingOwned ? (
                <>
                  <OwnedFacts
                    key={`facts-${inspectingOwned.id}`}
                    dragon={inspecting}
                    owned={inspectingOwned}
                    onReign={(reignLevel) =>
                      updateOwned(inspectingOwned.id, { reignLevel })
                    }
                  />
                  <OwnedNotes
                    key={`notes-${inspectingOwned.id}`}
                    notes={inspectingOwned.notes}
                    onSave={(notes) =>
                      updateOwned(inspectingOwned.id, { notes })
                    }
                  />
                </>
              ) : null}
              {inspectingTeams.length > 0 ? (
                <div>
                  <p className="text-label mb-1">
                    Already seated on {inspectingTeams.length} saved team
                    {inspectingTeams.length === 1 ? "" : "s"}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {inspectingTeams.map((lineup) => (
                      <li key={lineup.id}>
                        <Link
                          href={`/lineups/${lineup.id}`}
                          className="text-amber-200 underline-offset-2 hover:underline"
                        >
                          {lineup.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null
        }
      />
      <HabitPickerDialog
        dragon={habitDragon}
        open={!!habitDragon}
        onOpenChange={(next) => {
          if (!next) setHabitDragon(null);
        }}
        starRank={habitOwned?.starRank ?? 0}
        selected={habitOwned?.habits ?? []}
        ranks={habitOwned?.habitRanks}
        onChange={(habits) => {
          if (habitDragon) setDragonHabits(habitDragon.id, habits);
        }}
        onRankChange={(habit, rank) => {
          if (habitDragon) setDragonHabitRank(habitDragon.id, habit, rank);
        }}
        onStarChange={(next) => {
          if (habitDragon) setStars(habitDragon, next);
        }}
      />
      <AddDragonDialog open={unlistedOpen} onOpenChange={setUnlistedOpen} />
    </div>
  );
}

/**
 * A facet is a label plus its chips. The label is visible rather than only an
 * aria-label so a sighted reader can tell four near-identical chip rows apart.
 */
function FacetRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <p className="text-label w-16 shrink-0 sm:w-20">{label}</p>
      <ChipRow label={label} className="min-w-0 flex-1">
        {children}
      </ChipRow>
    </div>
  );
}

const ROLE_CLASS: Record<string, string> = {
  Heal: roleChipClass.healing,
  Tank: roleChipClass.tanking,
  DPS: roleChipClass.damage,
  CC: roleChipClass.control,
};

/**
 * What Copilot and Suggest actually read off this dragon: jobs, affinities,
 * and reign. Reign only lived in the save file before, so a player could not
 * see or fix it.
 */
function OwnedFacts({
  dragon,
  owned,
  onReign,
}: {
  dragon: Dragon;
  owned: OwnedDragon;
  onReign: (reignLevel: number) => void;
}) {
  const roles = dragonRoles(dragon).map((role) => roleShort[role]);
  const [draft, setDraft] = useState(String(owned.reignLevel));

  function commitReign(raw: string) {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isFinite(parsed)
      ? clampReign(parsed)
      : owned.reignLevel;
    setDraft(String(next));
    if (next !== owned.reignLevel) onReign(next);
  }

  return (
    <div className="surface-sunken space-y-2 rounded-xl p-3 ring-1 ring-foreground/10">
      <p className="text-label">In your pit</p>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="text-amber-200">★{owned.starRank}</span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <TroopIcons troops={dragon.affinities} iconClassName="size-4" />
        {roles.length > 0 ? (
          <>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            {roles.map((role) => (
              <span
                key={role}
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] ring-1",
                  ROLE_CLASS[role] ?? "ring-foreground/20",
                )}
              >
                {role}
              </span>
            ))}
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="pit-reign" className="shrink-0 text-[13px]">
          Reign level
        </Label>
        <Input
          id="pit-reign"
          type="number"
          inputMode="numeric"
          min={REIGN_MIN}
          max={REIGN_MAX}
          step={1}
          value={draft}
          className="h-10 w-24 md:h-8"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commitReign(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitReign(event.currentTarget.value);
            }
          }}
        />
        <span className="text-xs text-muted-foreground">
          {REIGN_MIN}–{REIGN_MAX}
        </span>
      </div>
    </div>
  );
}

function OwnedNotes({
  notes,
  onSave,
}: {
  notes: string;
  onSave: (notes: string) => void;
}) {
  const [draft, setDraft] = useState(notes);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="pit-notes">Notes</Label>
      <Textarea
        id="pit-notes"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Habits you skip, who it pairs with…"
        className="min-h-20 text-sm"
      />
      <Button
        size="sm"
        disabled={draft === notes}
        onClick={() => {
          onSave(draft);
          toast.success("Notes saved.");
        }}
      >
        Save notes
      </Button>
    </div>
  );
}
