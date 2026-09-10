"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { DragonPickList } from "@/components/dragon-pick-list";
import { EmptyState } from "@/components/empty-state";
import { MiniChip } from "@/components/chip";
import {
  TeamLineList,
  TeamNotesPanel,
} from "@/components/team-choice-card";
import { getCatalogDragon } from "@/data/dragons";
import { choicesAroundDragon } from "@/lib/around-choices";
import { rememberBuild } from "@/lib/build-session";
import { starsForCounterPick } from "@/lib/counter-pick";
import { newId, nowIso } from "@/lib/dragons";
import { TROOP_TYPES, troopShort } from "@/lib/labels";
import { usePit } from "@/lib/store";
import type { TroopType } from "@/lib/types";
import { toast } from "sonner";

function clampStars(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value) || 6));
}

export function TeamPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { state, addLineup } = usePit();
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
  const ownedStars = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row.starRank] as const)),
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
    const nextStars = starsForCounterPick(id, ownedStars, stars);
    setDragonId(id);
    setStars(nextStars);
    setQuery("");
    setOpenPicker(false);
    setActiveId(null);
    setPickedId(null);
    setSeatedId(null);
    if (next?.affinities[0]) setTroop(next.affinities[0]);
    writeQuery(id, nextStars);
  }

  function changeStars(next: number) {
    const value = clampStars(next);
    setStars(value);
    setPickedId(null);
    writeQuery(dragonId, value);
  }

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

  const compactChip = "min-h-7 px-2 py-0 text-[11px]";
  const troopOrder = dragon
    ? ([
        ...dragon.affinities,
        ...TROOP_TYPES.filter((item) => !dragon.affinities.includes(item)),
      ] as TroopType[])
    : TROOP_TYPES;

  if (openPicker) {
    return (
      <div
        data-team-page
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      >
        <DragonPickList
          data-team-pick="around"
          focusKey="around"
          title={dragon ? `Change from ${dragon.name}` : "Pick a dragon"}
          searchId="team-pick-search"
          searchLabel={
            dragon ? `Change from ${dragon.name}` : "Search dragons"
          }
          currentId={dragonId}
          query={query}
          ownedStars={ownedStars}
          canCancel={Boolean(dragon)}
          cancelLabel="Teams"
          onQuery={setQuery}
          onPick={pickDragon}
          onCancel={() => {
            setOpenPicker(false);
            setQuery("");
          }}
        />
      </div>
    );
  }

  if (!dragon) return null;

  return (
    <div
      data-team-page
      className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden"
    >
      <section
        data-team-seed
        className="shrink-0 rounded-xl bg-card/60 px-2 py-1.5 ring-1 ring-foreground/10"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-build-around={dragon.id}
            aria-label={`Change from ${dragon.name}`}
            className="flex min-w-0 items-center gap-1.5 rounded-md text-left hover:bg-muted/60"
            onClick={() => {
              setOpenPicker(true);
              setQuery("");
            }}
          >
            <DragonIcon
              dragonId={dragon.id}
              name={dragon.name}
              rarity={dragon.rarity}
              selected
              size="sm"
            />
            <span className="truncate text-[13px] text-amber-50">
              {dragon.name}
            </span>
          </button>
          <div
            data-star-owner
            className="flex shrink-0 items-center gap-0.5"
            aria-label={`Stars on ${dragon.name}`}
          >
            <button
              type="button"
              aria-label={`One less star on ${dragon.name}`}
              className="flex size-6 items-center justify-center rounded text-[12px] ring-1 ring-foreground/20 hover:bg-muted"
              onClick={() => changeStars(stars - 1)}
            >
              −
            </button>
            <span className="min-w-6 text-center text-[11px] tabular-nums text-amber-200">
              ★{stars}
            </span>
            <button
              type="button"
              aria-label={`One more star on ${dragon.name}`}
              className="flex size-6 items-center justify-center rounded text-[12px] ring-1 ring-foreground/20 hover:bg-muted"
              onClick={() => changeStars(stars + 1)}
            >
              +
            </button>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {troopOrder.map((item) => (
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
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(12rem,1fr)_minmax(7rem,28%)] gap-1.5 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:grid-rows-[minmax(0,1fr)]">
        {choices.length === 0 ? (
          <EmptyState
            className="min-h-0 py-8 lg:col-start-1 lg:row-start-1"
            title={`No line around ${dragon.name}`}
            description="Try another troop chip."
          />
        ) : (
          <section
            ref={listRef}
            tabIndex={0}
            onKeyDown={onListKey}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10 outline-none focus-visible:ring-amber-300 lg:col-start-1 lg:row-start-1"
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
        <div className="min-h-0 min-w-0 lg:col-start-2 lg:row-start-1">
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
    </div>
  );
}
