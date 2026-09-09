"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import { StarStepper } from "@/components/star-rank";
import {
  TeamLineList,
  TeamNotesPanel,
} from "@/components/team-choice-card";
import { BetaBadge } from "@/components/beta-badge";
import { Input } from "@/components/ui/input";
import { DRAGONS, getCatalogDragon } from "@/data/dragons";
import { choicesAroundDragon } from "@/lib/around-choices";
import { rememberBuild } from "@/lib/build-session";
import { newId, nowIso } from "@/lib/dragons";
import { TROOP_TYPES, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { TroopType } from "@/lib/types";
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
  const listRef = useRef<HTMLDivElement>(null);
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
  const [activeId, setActiveId] = useState<string | null>(null);
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
      state,
    });
  }, [dragon, stars, troop, state]);

  const active = choices.find((row) => row.id === activeId) ?? choices[0] ?? null;
  const ownedIds = useMemo(
    () => new Set(state.owned.map((row) => row.dragonId)),
    [state.owned],
  );

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyMinHeight: body.style.minHeight,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    body.style.minHeight = "100%";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      body.style.minHeight = prev.bodyMinHeight;
    };
  }, []);

  useEffect(() => {
    if (!choices.length) {
      setActiveId(null);
      return;
    }
    if (!choices.some((row) => row.id === activeId)) {
      setActiveId(choices[0].id);
    }
  }, [choices, activeId]);

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
    setActiveId(null);
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

  function useActive() {
    if (!active) return;
    const ids = [active.line.left, active.line.vanguard, active.line.right];
    const owned = ids.every((id) =>
      state.owned.some((row) => row.dragonId === id),
    );
    const created = {
      ...active.lineup,
      id: newId("lineup"),
      kind: owned ? ("pit" as const) : ("theory" as const),
      ignoreLevel: !owned,
      craftStars: stars,
      updatedAt: nowIso(),
    };
    addLineup(created);
    rememberBuild(created.kind, created.id);
    setPickedId(active.id);
    setSeatedId(created.id);
    toast.success(`Seated ${active.line.name}.`);
  }

  function onListKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!choices.length) return;
    const index = Math.max(
      0,
      choices.findIndex((row) => row.id === (active?.id ?? "")),
    );
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = choices[Math.min(choices.length - 1, index + 1)];
      if (next) setActiveId(next.id);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = choices[Math.max(0, index - 1)];
      if (next) setActiveId(next.id);
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      useActive();
    }
  }

  const liveTags = (dragon?.tags ?? []).slice(0, 3);
  const compactChip = "min-h-7 px-2 py-0 text-[11px]";

  const picker = (
      <section
        ref={pickerRef}
        className="shrink-0 rounded-xl bg-card/60 px-2 py-1.5 ring-1 ring-foreground/10"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 pl-8 text-sm"
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
            {openPicker ? (
              <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl bg-popover py-1 shadow-lg ring-1 ring-foreground/15">
                {filtered.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">
                    No pit match.
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
              className="flex min-w-0 items-center gap-1.5 rounded-lg bg-amber-500/10 px-1.5 py-1 ring-1 ring-amber-400/30"
            >
              <DragonIcon
                dragonId={dragon.id}
                name={dragon.name}
                rarity={dragon.rarity}
                selected
                size="xs"
              />
              <p className="max-w-[9rem] truncate text-[13px] text-amber-50 sm:max-w-none">
                {dragon.name}
                {liveTags.length ? (
                  <span className="hidden text-muted-foreground sm:inline">
                    {" "}
                    · {liveTags.join(" · ")}
                  </span>
                ) : null}
              </p>
            </div>
          ) : null}
          <div data-star-owner aria-label={`Stars on ${dragon?.name ?? "this dragon"}`}>
            <StarStepper
              size="sm"
              value={stars}
              onDelta={(delta) => changeStars(stars + delta)}
            />
          </div>
        </div>
        {dragon ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(
              [
                ...dragon.affinities,
                ...TROOP_TYPES.filter((item) => !dragon.affinities.includes(item)),
              ] as TroopType[]
            ).map((item) => (
              <MiniChip
                key={item}
                className={compactChip}
                active={troop === item}
                onClick={() => {
                  setTroop(item);
                  setPickedId(null);
                }}
              >
                {troopShort[item]}
              </MiniChip>
            ))}
          </div>
        ) : null}
      </section>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h1 className="font-heading text-base tracking-wide">Team</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/counter"
            className="text-[13px] text-amber-200 hover:underline"
          >
            Counter
          </Link>
          <Link
            href="/coach"
            className="inline-flex items-center gap-1 text-[13px] text-amber-200 hover:underline"
          >
            <Sparkles className="size-3.5" />
            Copilot
            <BetaBadge />
          </Link>
        </div>
      </div>

      {!dragon ? (
        <>
          {picker}
          <EmptyState
            className="min-h-0 flex-1 py-8 sm:py-10"
            title="Pick the dragon you want to march around"
            description="One name — Kalspire, Malachite, Vhagar. The builder seats several complete threes around that pick so you can compare kit payoffs and gaps."
          />
        </>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_minmax(10rem,34%)] gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:grid-rows-[auto_minmax(0,1fr)]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">{picker}</div>
          {choices.length === 0 ? (
            <EmptyState
              className="min-h-0 py-8 lg:col-start-1 lg:row-start-2"
              title={`No three-dragon line around ${dragon.name}`}
              description="Try another troop type. Suggest still needs a healer, a soak, and a damage seat."
            />
          ) : (
            <section
              ref={listRef}
              tabIndex={0}
              onKeyDown={onListKey}
              className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10 outline-none focus-visible:ring-amber-300 lg:col-start-1 lg:row-start-2"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-foreground/10 px-2 py-1.5">
                <p className="text-label">
                  Around {dragon.name} · {choices.length}
                </p>
              </div>
              <TeamLineList
                choices={choices}
                pinnedId={dragon.id}
                ownedIds={ownedIds}
                activeId={active?.id ?? null}
                seated={pickedId === active?.id}
                onHighlight={setActiveId}
              />
            </section>
          )}
          <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-span-2">
            <TeamNotesPanel
              choice={active}
              seated={pickedId === active?.id}
              tweakHref={
                pickedId === active?.id && seatedId ? `/lineups/${seatedId}` : null
              }
              onUse={useActive}
            />
          </div>
        </div>
      )}
    </div>
  );
}
