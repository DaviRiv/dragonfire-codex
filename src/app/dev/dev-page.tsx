"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AbilityHover, AbilityRankTable, AbilityGlossList } from "@/components/ability-insight";
import { AbilityTag, AbilityText } from "@/components/ability-text";
import { AffinityBadges } from "@/components/affinity-badges";
import { MiniChip } from "@/components/chip";
import { DragonIcon } from "@/components/dragon-icon";
import { EmptyState } from "@/components/empty-state";
import { StatGrid } from "@/components/dragon-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commandHeading } from "@/data/command-names";
import { persistDevMode } from "@/lib/dev-mode";
import {
  allCatalogs,
  catalogCoverage,
  catalogSnapshot,
  type CatalogHabit,
  type CatalogSkill,
  type DragonCatalog,
} from "@/lib/dragon-catalog";
import { useDevMode } from "@/lib/use-dev-mode";
import {
  breedLabels,
  marchLabels,
  rarityLabels,
  slotLabels,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Search, Share2, Wrench } from "lucide-react";
import { toast } from "sonner";

type CoverageFilter = "all" | "needs" | "named";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-label">{label}</p>
      <p className="mt-0.5 break-all font-mono text-[12px] text-stone-200">
        {value}
      </p>
    </div>
  );
}

function SkillBlock({
  title,
  skill,
  dragonId,
}: {
  title: string;
  skill: CatalogSkill;
  dragonId: string;
}) {
  return (
    <section className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
      <p className="text-label">{title}</p>
      {skill.names.length > 0 ? (
        <p className="mt-1 flex flex-wrap gap-x-2 text-[12px] text-df-status">
          {skill.names.join(" · ")}
        </p>
      ) : null}
      {skill.short ? (
        <p className="mt-1 text-[12px] text-muted-foreground">{skill.short}</p>
      ) : null}
      <p className="mt-2 text-[13px] leading-relaxed">
        <AbilityText
          text={skill.body}
          dragonId={dragonId}
          interactive
        />
      </p>
    </section>
  );
}

function HabitMetaCard({
  row,
  dragonId,
}: {
  row: CatalogHabit;
  dragonId: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl p-3 ring-1",
        row.needsScreenshot
          ? "bg-amber-950/25 ring-amber-400/35"
          : "bg-muted/40 ring-foreground/10",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <p className="font-heading text-[15px] tracking-wide">
          Habit {row.habit}
          <span className="text-muted-foreground"> · </span>
          {row.officialName ?? (
            <span className="text-amber-200">Needs screenshot</span>
          )}
        </p>
        <p className="text-label">{row.stars}★</p>
      </div>
      {row.names.length > 0 ? (
        <p className="mt-1 text-[12px] text-df-status">
          {row.names.join(" · ")}
        </p>
      ) : null}
      {row.short ? (
        <p className="mt-1 text-[12px] text-muted-foreground">{row.short}</p>
      ) : null}
      {row.body ? (
        <p className="mt-2 text-[13px] leading-relaxed">
          <AbilityText text={row.body} dragonId={dragonId} interactive />
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Habit text not in the Hub dump.
        </p>
      )}
      {row.scale.length > 0 ? (
        <AbilityRankTable rows={row.scale} className="mt-2" />
      ) : null}
    </section>
  );
}

function DragonDetail({ entry }: { entry: DragonCatalog }) {
  const { dragon } = entry;

  function copyJson() {
    const payload = JSON.stringify(catalogSnapshot(entry), null, 2);
    void navigator.clipboard.writeText(payload).then(
      () => toast.success(`Copied ${dragon.name} metadata.`),
      () => toast.error("Could not copy."),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <DragonIcon
          dragonId={dragon.id}
          name={dragon.name}
          rarity={dragon.rarity}
          size="xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xl tracking-wide">{dragon.name}</h2>
          <p className="text-sm text-muted-foreground">{dragon.epithet}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="rounded-md font-normal">
              {rarityLabels[dragon.rarity]}
            </Badge>
            <Badge variant="outline" className="rounded-md font-normal">
              {breedLabels[dragon.breed]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "rounded-md font-normal",
                entry.needsScreenshot
                  ? "border-amber-400/40 text-amber-200"
                  : "border-emerald-400/40 text-emerald-200",
              )}
            >
              Names {entry.namedCount}/{entry.habitSlots}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={copyJson}>
          Copy JSON
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetaRow label="Id" value={dragon.id} />
        <MetaRow label="March" value={marchLabels[dragon.marchSpeed]} />
        <MetaRow label="Vanguard buffs" value={slotLabels[dragon.flankBonus]} />
      </div>
      <AffinityBadges affinities={dragon.affinities} />
      <div>
        <p className="text-label mb-2">Base stats</p>
        <StatGrid stats={dragon.stats} compact />
      </div>
      {dragon.tags.length > 0 ? (
        <div>
          <p className="text-label mb-1.5">Tags</p>
          <div className="flex flex-wrap gap-1">
            {dragon.tags.map((tag) => (
              <AbilityTag key={tag} tag={tag} dragonId={dragon.id} />
            ))}
          </div>
        </div>
      ) : null}
      {(dragon.provides?.length ?? 0) > 0 || (dragon.needs?.length ?? 0) > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-label mb-1.5">Provides</p>
            {dragon.provides?.length ? (
              <ul className="space-y-1 text-[13px]">
                {dragon.provides.map((gate) => (
                  <li key={`${gate.ability}-${gate.unlockStars}`}>
                    <AbilityHover name={gate.ability} dragonId={dragon.id}>
                      <span className="cursor-pointer underline decoration-dotted decoration-df-status/55 underline-offset-2">
                        {gate.ability}
                      </span>
                    </AbilityHover>
                    {gate.unlockStars != null ? ` · ${gate.unlockStars}★` : " · Command"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">None listed.</p>
            )}
          </div>
          <div>
            <p className="text-label mb-1.5">Needs</p>
            {dragon.needs?.length ? (
              <ul className="space-y-1 text-[13px]">
                {dragon.needs.map((gate) => (
                  <li key={`${gate.ability}-${gate.unlockStars}`}>
                    <AbilityHover name={gate.ability} dragonId={dragon.id}>
                      <span className="cursor-pointer underline decoration-dotted decoration-df-status/55 underline-offset-2">
                        {gate.ability}
                      </span>
                    </AbilityHover>
                    {gate.unlockStars != null ? ` · ${gate.unlockStars}★` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">None listed.</p>
            )}
          </div>
        </div>
      ) : null}

      {entry.buffs.some((row) => row.polarity === "buff") ? (
        <section className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
          <p className="flex items-center gap-1 text-[0.6875rem] font-medium tracking-[0.12em] text-df-buff uppercase">
            <ArrowUp className="size-3.5" aria-hidden />
            Buffs
          </p>
          <AbilityGlossList
            glosses={entry.buffs.filter((row) => row.polarity === "buff")}
            dragonId={dragon.id}
            className="mt-2"
          />
        </section>
      ) : null}
      {entry.buffs.some((row) => row.polarity === "spread") ? (
        <section className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
          <p className="flex items-center gap-1 text-[0.6875rem] font-medium tracking-[0.12em] text-df-buff uppercase">
            <Share2 className="size-3.5" aria-hidden />
            Spreading buffs
          </p>
          <AbilityGlossList
            glosses={entry.buffs.filter((row) => row.polarity === "spread")}
            dragonId={dragon.id}
            className="mt-2"
          />
        </section>
      ) : null}
      {entry.buffs.some((row) => row.polarity === "debuff") ? (
        <section className="rounded-xl bg-muted/40 p-3 ring-1 ring-foreground/10">
          <p className="flex items-center gap-1 text-[0.6875rem] font-medium tracking-[0.12em] text-df-debuff uppercase">
            <ArrowDown className="size-3.5" aria-hidden />
            Debuffs
          </p>
          <AbilityGlossList
            glosses={entry.buffs.filter((row) => row.polarity === "debuff")}
            dragonId={dragon.id}
            className="mt-2"
          />
        </section>
      ) : null}

      <SkillBlock
        title="Vanguard"
        skill={entry.vanguard}
        dragonId={dragon.id}
      />
      <SkillBlock
        title={commandHeading(dragon.id)}
        skill={entry.command}
        dragonId={dragon.id}
      />
      {entry.habits.map((habit) => (
        <HabitMetaCard
          key={habit.habit}
          row={habit}
          dragonId={dragon.id}
        />
      ))}
    </div>
  );
}

export function DevPage() {
  const unlocked = useDevMode();
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CoverageFilter>("all");
  const catalogs = useMemo(() => allCatalogs(), []);
  const coverage = useMemo(() => catalogCoverage(catalogs), [catalogs]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogs.filter((row) => {
      if (filter === "needs" && !row.needsScreenshot) return false;
      if (filter === "named" && row.needsScreenshot) return false;
      if (!needle) return true;
      const hay = [
        row.dragon.name,
        row.dragon.id,
        row.dragon.epithet,
        ...row.habits.map((habit) => habit.officialName ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [catalogs, filter, query]);

  const selectedId = params.get("dragon");
  const selected =
    visible.find((row) => row.dragon.id === selectedId) ??
    catalogs.find((row) => row.dragon.id === selectedId) ??
    visible[0] ??
    null;

  function selectDragon(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("dragon", id);
    router.replace(`/dev?${next.toString()}`, { scroll: false });
  }

  function hideTab() {
    persistDevMode(false);
    router.replace("/");
  }

  if (unlocked === null) {
    return (
      <p className="text-sm text-muted-foreground">Opening the catalog…</p>
    );
  }

  if (!unlocked) {
    return (
      <EmptyState
        title="Dev catalog"
        description="This tab is personal. Open it with ?dev=1 on this URL, then it stays on this browser. ?dev=0 hides it again."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-label flex items-center gap-1.5">
            <Wrench className="size-3.5" aria-hidden />
            Developer
          </p>
          <h1 className="font-heading text-xl tracking-wide">Dragon metadata</h1>
          <p className="mt-1 max-w-xl text-[13px] leading-snug text-muted-foreground">
            Hub kit plus in-game habit names from Star Progression screenshots.
            Moondancer, Venator, Malachite, Rhysarion, Sunfyre, Kalspire,
            Caraxes, Syrax, Vhagar, and Vermax are filled in. Send the same
            five habit cards for the next dragon and they land here.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={hideTab}>
          Hide Dev tab
        </Button>
      </div>

      <p className="rounded-xl bg-card/70 px-3 py-2 text-[13px] ring-1 ring-foreground/10">
        Habit names {coverage.named}/{coverage.slots} · {coverage.complete} of{" "}
        {coverage.dragons} dragons complete. Power is not in the Hub dump.
      </p>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name, id, or habit"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          enterKeyHint="search"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <MiniChip active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </MiniChip>
        <MiniChip
          active={filter === "needs"}
          onClick={() => setFilter("needs")}
        >
          Needs screenshot
        </MiniChip>
        <MiniChip
          active={filter === "named"}
          onClick={() => setFilter("named")}
        >
          Names filled
        </MiniChip>
      </div>

      <div className="grid gap-3 md:grid-cols-[16.5rem_minmax(0,1fr)] md:items-start">
        <ul className="max-h-[40vh] space-y-1 overflow-y-auto rounded-xl bg-card/60 p-1.5 ring-1 ring-foreground/10 md:sticky md:top-16 md:max-h-[calc(100dvh-8rem)]">
          {visible.length === 0 ? (
            <li className="px-2 py-3 text-[13px] text-muted-foreground">
              No dragons match.
            </li>
          ) : (
            visible.map((row) => {
              const active = selected?.dragon.id === row.dragon.id;
              return (
                <li key={row.dragon.id}>
                  <button
                    type="button"
                    onClick={() => selectDragon(row.dragon.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                      active
                        ? "bg-amber-500/20 ring-1 ring-amber-300/50"
                        : "hover:bg-muted",
                    )}
                  >
                    <DragonIcon
                      dragonId={row.dragon.id}
                      name={row.dragon.name}
                      rarity={row.dragon.rarity}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {row.dragon.name}
                      </span>
                      <span
                        className={cn(
                          "block text-[11px]",
                          row.needsScreenshot
                            ? "text-amber-200/90"
                            : "text-emerald-200/90",
                        )}
                      >
                        {row.namedCount}/{row.habitSlots} names
                        {row.needsScreenshot ? " · screenshot" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="rounded-xl bg-card/50 p-3 ring-1 ring-foreground/10 sm:p-4">
          {selected ? (
            <DragonDetail entry={selected} />
          ) : (
            <p className="text-sm text-muted-foreground">Pick a dragon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
