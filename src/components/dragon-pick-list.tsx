"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ComponentProps,
} from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { SearchField } from "@/components/search-field";
import { SectionLabel } from "@/components/section-label";
import { TroopIcons } from "@/components/troop-icon";
import { DRAGONS } from "@/data/dragons";
import { filterDragonPicks } from "@/lib/counter-pick";
import { slotShort, troopLabels } from "@/lib/labels";
import type { Dragon, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_TAKEN = new Map<string, SlotId>();
const SLOT_MARK: Record<SlotId, string> = {
  left: "L",
  vanguard: "V",
  right: "R",
};

function pickGridColumns(): number {
  const el = document.querySelector<HTMLElement>("[data-pick-grid]");
  if (!el) return 3;
  const cols = getComputedStyle(el).gridTemplateColumns;
  const n = cols.split(" ").filter((part) => part.trim()).length;
  return n > 0 ? n : 3;
}

function firstOpenIndex(
  rows: Dragon[],
  takenBy: Map<string, SlotId>,
  currentId: string | null,
): number {
  const current = currentId
    ? rows.findIndex((row) => row.id === currentId)
    : -1;
  if (current >= 0) return current;
  const open = rows.findIndex((row) => !takenBy.has(row.id));
  return open >= 0 ? open : 0;
}

type DragonPickListProps = {
  title: string;
  searchId: string;
  searchLabel: string;
  currentId: string | null;
  query: string;
  ownedStars: Map<string, number>;
  takenBy?: Map<string, SlotId>;
  canCancel?: boolean;
  cancelLabel?: string;
  focusKey?: string;
  onQuery: (value: string) => void;
  onPick: (id: string) => void;
  onCancel?: () => void;
} & Omit<ComponentProps<"section">, "children" | "title">;

export function DragonPickList({
  title,
  searchId,
  searchLabel,
  currentId,
  query,
  ownedStars,
  takenBy: takenByProp,
  canCancel = false,
  cancelLabel = "Back",
  focusKey,
  onQuery,
  onPick,
  onCancel,
  className,
  ...sectionProps
}: DragonPickListProps) {
  const takenBy = takenByProp ?? EMPTY_TAKEN;
  const [hi, setHi] = useState(0);

  const rows = useMemo(
    () =>
      filterDragonPicks(DRAGONS, {
        query,
        ownedIds: ownedStars.keys(),
      }),
    [query, ownedStars],
  );

  const searching = query.trim().length > 0;
  const ownedRows = !searching
    ? rows.filter((row) => ownedStars.has(row.id))
    : [];
  const restRows = ownedRows.length
    ? rows.filter((row) => !ownedStars.has(row.id))
    : rows;

  useEffect(() => {
    const el = document.getElementById(searchId) as HTMLInputElement | null;
    el?.focus();
    el?.select();
  }, [searchId, focusKey]);

  useEffect(() => {
    setHi(firstOpenIndex(rows, takenBy, query.trim() ? null : currentId));
  }, [query, rows, takenBy, currentId]);

  useEffect(() => {
    if (hi >= rows.length) setHi(0);
  }, [hi, rows.length]);

  useEffect(() => {
    const id = rows[hi]?.id;
    if (!id) return;
    const el = document.querySelector(`[data-pick-dragon="${id}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [hi, rows]);

  function move(delta: number) {
    if (rows.length === 0) return;
    setHi((current) => {
      let next = current;
      for (let step = 0; step < rows.length; step++) {
        next = (next + delta + rows.length) % rows.length;
        const row = rows[next];
        if (!row) return current;
        if (!takenBy.has(row.id) || row.id === currentId) return next;
      }
      return current;
    });
  }

  function onKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(pickGridColumns());
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-pickGridColumns());
    } else if (event.key === "Enter" && rows[hi]) {
      event.preventDefault();
      const row = rows[hi];
      if (takenBy.has(row.id) && row.id !== currentId) return;
      onPick(row.id);
    } else if (event.key === "Home") {
      event.preventDefault();
      setHi(firstOpenIndex(rows, takenBy, currentId));
    } else if (event.key === "End") {
      event.preventDefault();
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        if (row && (!takenBy.has(row.id) || row.id === currentId)) {
          setHi(i);
          return;
        }
      }
    } else if (event.key === "Escape" && canCancel) {
      event.preventDefault();
      onCancel?.();
    }
  }

  const hiId = rows[hi]?.id ?? null;
  const emptyCopy = "No dragon matches that search.";

  return (
    <section
      {...sectionProps}
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-card/70 ring-1 ring-foreground/10",
        className,
      )}
    >
      <div className="shrink-0 border-b border-foreground/10 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <SectionLabel>{title}</SectionLabel>
          <SearchField
            id={searchId}
            value={query}
            onChange={onQuery}
            onKeyDown={onKey}
            label={searchLabel}
            autoFocus
          />
          {canCancel ? (
            <button
              type="button"
              className="text-[13px] text-amber-200 hover:underline"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">{emptyCopy}</p>
        ) : ownedRows.length > 0 ? (
          <>
            <p className="text-label px-2 pt-2">In your pit</p>
            <PickGrid
              rows={ownedRows}
              currentId={currentId}
              takenBy={takenBy}
              ownedStars={ownedStars}
              hiId={hiId}
              onHover={(id) =>
                setHi(Math.max(0, rows.findIndex((row) => row.id === id)))
              }
              onPick={onPick}
            />
            {restRows.length > 0 ? (
              <>
                <p className="text-label px-2 pt-1">Everyone else</p>
                <PickGrid
                  rows={restRows}
                  currentId={currentId}
                  takenBy={takenBy}
                  ownedStars={ownedStars}
                  hiId={hiId}
                  onHover={(id) =>
                    setHi(Math.max(0, rows.findIndex((row) => row.id === id)))
                  }
                  onPick={onPick}
                />
              </>
            ) : null}
          </>
        ) : (
          <PickGrid
            rows={rows}
            currentId={currentId}
            takenBy={takenBy}
            ownedStars={ownedStars}
            hiId={hiId}
            onHover={(id) =>
              setHi(Math.max(0, rows.findIndex((row) => row.id === id)))
            }
            onPick={onPick}
          />
        )}
      </div>
    </section>
  );
}

function PickGrid({
  rows,
  currentId,
  takenBy,
  ownedStars,
  hiId,
  onHover,
  onPick,
}: {
  rows: Dragon[];
  currentId: string | null;
  takenBy: Map<string, SlotId>;
  ownedStars: Map<string, number>;
  hiId: string | null;
  onHover: (id: string) => void;
  onPick: (id: string) => void;
}) {
  return (
    <ul
      data-pick-grid
      className="grid grid-cols-3 content-start gap-1 p-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
    >
      {rows.map((row) => {
        const takenSlot = takenBy.get(row.id);
        const taken = Boolean(takenSlot) && row.id !== currentId;
        const current = row.id === currentId;
        const hi = row.id === hiId;
        const stars = ownedStars.get(row.id);
        return (
          <li key={row.id} className="min-w-0">
            <button
              type="button"
              data-pick-dragon={row.id}
              data-pick-troops={row.affinities.join(",")}
              disabled={taken}
              title={
                taken && takenSlot
                  ? `${row.name} is already ${slotShort[takenSlot]}`
                  : `${row.name} · ${row.affinities.map((troop) => troopLabels[troop]).join(", ")}`
              }
              aria-current={current ? "true" : undefined}
              onMouseEnter={() => onHover(row.id)}
              onClick={() => onPick(row.id)}
              className={cn(
                "relative flex w-full flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center",
                current && "bg-amber-500/15 ring-1 ring-amber-300",
                hi && !current && "bg-muted ring-1 ring-foreground/15",
                taken && "cursor-not-allowed opacity-35",
                !taken && !current && "hover:bg-muted",
              )}
            >
              {taken && takenSlot ? (
                <span className="absolute top-0.5 right-0.5 rounded-sm bg-background px-1 text-[9px] font-semibold tracking-wide text-muted-foreground ring-1 ring-foreground/15">
                  {SLOT_MARK[takenSlot]}
                </span>
              ) : null}
              <DragonIcon
                dragonId={row.id}
                name={row.name}
                rarity={row.rarity}
                size="md"
                selected={current}
                dimmed={taken}
              />
              <span className="w-full truncate text-[11px] leading-tight">
                {row.name}
              </span>
              <span className="flex items-center justify-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                <TroopIcons
                  troops={row.affinities}
                  iconClassName="size-4"
                />
                {stars != null ? `★${stars}` : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
