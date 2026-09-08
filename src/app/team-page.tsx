"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { StarStepper } from "@/components/star-rank";
import { TeamChoiceCard } from "@/components/team-choice-card";
import { BetaBadge } from "@/components/beta-badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { lineupFromAiLine } from "@/lib/ai/coach";
import { choicesAroundDragon } from "@/lib/around-choices";
import { rememberBuild } from "@/lib/build-session";
import { newId, nowIso } from "@/lib/dragons";
import { MODES, TROOP_TYPES, modeShort, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { LineupMode, TroopType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

function clampStars(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value) || 6));
}

export function TeamPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { state, addLineup } = usePit();
  const pickerRef = useRef<HTMLDivElement>(null);
  const initialDragon = getCatalogDragon(search.get("dragon") ?? "")?.id ?? null;
  const initialStars = clampStars(Number(search.get("stars") ?? 6));
  const seed = initialDragon ? getCatalogDragon(initialDragon) : null;

  const [query, setQuery] = useState("");
  const [openPicker, setOpenPicker] = useState(!initialDragon);
  const [dragonId, setDragonId] = useState<string | null>(initialDragon);
  const [stars, setStars] = useState(initialStars);
  const [troop, setTroop] = useState<TroopType>(
    seed?.affinities[0] ?? "shieldbearers",
  );
  const [mode, setMode] = useState<LineupMode>("pvp");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [seatedId, setSeatedId] = useState<string | null>(null);

  const dragon = dragonId ? (getCatalogDragon(dragonId) ?? null) : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DRAGONS;
    return DRAGONS.filter((row) =>
      `${row.name} ${row.epithet} ${row.breed}`.toLowerCase().includes(q),
    );
  }, [query]);

  const choices = useMemo(() => {
    if (!dragon) return [];
    return choicesAroundDragon({
      dragonId: dragon.id,
      stars,
      troop,
      mode,
      state,
    });
  }, [dragon, stars, troop, mode, state]);

  function writeQuery(nextDragon: string | null, nextStars: number) {
    const params = new URLSearchParams();
    if (nextDragon) params.set("dragon", nextDragon);
    params.set("stars", String(nextStars));
    const qs = params.toString();
    router.replace(qs ? `/team?${qs}` : "/team", { scroll: false });
  }

  function pickDragon(id: string) {
    const next = getCatalogDragon(id);
    setDragonId(id);
    setQuery("");
    setOpenPicker(false);
    setPickedId(null);
    setSeatedId(null);
    if (next?.affinities[0]) setTroop(next.affinities[0]);
    writeQuery(id, stars);
  }

  function changeStars(next: number) {
    const value = clampStars(next);
    setStars(value);
    setPickedId(null);
    writeQuery(dragonId, value);
  }

  useEffect(() => {
    if (!openPicker) return;
    function onDoc(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setOpenPicker(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openPicker]);

  function useChoice(choiceId: string) {
    const choice = choices.find((row) => row.id === choiceId);
    if (!choice) return;
    const owned = [choice.line.left, choice.line.vanguard, choice.line.right].every(
      (id) => state.owned.some((row) => row.dragonId === id),
    );
    const filled = lineupFromAiLine(choice.line, state, owned ? "pit" : "hatchery");
    const created = {
      ...filled,
      id: newId("lineup"),
      craftStars: stars,
      updatedAt: nowIso(),
    };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    setPickedId(choice.id);
    setSeatedId(created.id);
    toast.success(`Seated ${choice.line.name}.`);
  }

  const liveTags = (dragon?.tags ?? []).slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl tracking-wide sm:text-2xl">
            Team builder
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
            Pick the one dragon you want to march around. The builder seats
            several complete lines for that name — compare kit payoffs and
            gaps, then take one. Copilot is a separate beta chat.
          </p>
        </div>
        <Link
          href="/coach"
          className="inline-flex items-center gap-1.5 text-sm text-amber-200 hover:underline"
        >
          <Sparkles className="size-4" />
          Open Copilot
          <BetaBadge />
        </Link>
      </div>

      <section
        ref={pickerRef}
        className="rounded-2xl bg-card/60 p-3 ring-1 ring-foreground/10"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <p className="text-label">Build around</p>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={
                  dragon ? `Change from ${dragon.name}…` : "Search a dragon…"
                }
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpenPicker(true);
                }}
                onFocus={() => setOpenPicker(true)}
                enterKeyHint="search"
              />
            </div>
            {openPicker ? (
              <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl bg-popover py-1 shadow-lg ring-1 ring-foreground/15">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No hatchery match.
                  </li>
                ) : (
                  filtered.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => pickDragon(row.id)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-muted",
                          row.id === dragonId && "bg-amber-500/15",
                        )}
                      >
                        <DragonIcon
                          dragonId={row.id}
                          name={row.name}
                          rarity={row.rarity}
                          size="xs"
                        />
                        <span className="text-sm">{row.name}</span>
                        <span className="ml-auto truncate pl-2 text-[11px] text-muted-foreground">
                          {row.epithet}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
          {dragon ? (
            <div
              data-build-around={dragon.id}
              className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-2 py-1.5 ring-1 ring-amber-400/30"
            >
              <DragonIcon
                dragonId={dragon.id}
                name={dragon.name}
                rarity={dragon.rarity}
                selected
                size="sm"
                stars={stars}
              />
              <div>
                <p className="text-sm text-amber-50">{dragon.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  ★{stars}
                  {liveTags.length ? ` · ${liveTags.join(" · ")}` : ""}
                </p>
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-label">Stars you have</p>
            <div className="mt-1">
              <StarStepper
                value={stars}
                onDelta={(delta) => changeStars(stars + delta)}
              />
            </div>
          </div>
        </div>
        {dragon ? (
          <div className="mt-3 flex flex-wrap gap-1 border-t border-foreground/10 pt-3">
            {(
              [
                ...dragon.affinities,
                ...TROOP_TYPES.filter((item) => !dragon.affinities.includes(item)),
              ] as TroopType[]
            ).map((item) => (
              <MiniChip
                key={item}
                active={troop === item}
                onClick={() => {
                  setTroop(item);
                  setPickedId(null);
                }}
              >
                {troopShort[item]}
              </MiniChip>
            ))}
            {MODES.map((item) => (
              <MiniChip
                key={item}
                active={mode === item}
                onClick={() => {
                  setMode(item);
                  setPickedId(null);
                }}
              >
                {modeShort[item]}
              </MiniChip>
            ))}
          </div>
        ) : null}
      </section>

      {!dragon ? (
        <EmptyState
          title="Pick the dragon you want to march around"
          description="One name — Kalspire, Malachite, Vhagar. The builder seats several complete threes around that pick so you can compare kit payoffs and gaps."
        />
      ) : choices.length === 0 ? (
        <EmptyState
          title={`No three-dragon line around ${dragon.name}`}
          description="Try another troop type. Suggest still needs a healer, a soak, and a damage seat."
        />
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-label">
              Lines around {dragon.name} · {choices.length}
            </p>
            {seatedId ? (
              <Link
                href={`/lineups/${seatedId}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Tweak seats
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {choices.map((choice) => (
              <TeamChoiceCard
                key={choice.id}
                choice={choice}
                selected={pickedId === choice.id}
                onPick={() => useChoice(choice.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
