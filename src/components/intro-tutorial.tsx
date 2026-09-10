"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DragonIcon } from "@/components/dragon-icon";
import { StarStepper } from "@/components/star-rank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DRAGONS } from "@/data/dragons";
import { filterDragonPicks } from "@/lib/counter-pick";
import { usePit } from "@/lib/store";
import {
  hasSeenTutorial,
  markTutorialSeen,
  shouldOfferIntro,
} from "@/lib/tutorial";
import type { Dragon } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

type Step = "welcome" | "pit";

export function IntroTutorial() {
  const { ready, state, setCatalogOwned, loadSample } = usePit();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [query, setQuery] = useState("");
  const decided = useRef(false);

  const ownedById = useMemo(
    () => new Map(state.owned.map((row) => [row.dragonId, row] as const)),
    [state.owned],
  );

  const catalog = useMemo(() => {
    if (!query.trim()) return DRAGONS;
    return filterDragonPicks(DRAGONS, {
      query,
      ownedIds: ownedById.keys(),
    });
  }, [query, ownedById]);

  const finish = useCallback(() => {
    markTutorialSeen();
    setOpen(false);
    if (pathname !== "/team") router.replace("/team");
  }, [pathname, router]);

  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    const seen = hasSeenTutorial();
    if (
      shouldOfferIntro({
        seen,
        ownedCount: state.owned.length,
        lineupCount: state.lineups.length,
      })
    ) {
      setOpen(true);
      return;
    }
    if (!seen) markTutorialSeen();
  }, [ready, state.lineups.length, state.owned.length]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open) return null;

  function setStars(dragon: Dragon, starRank: number) {
    const next = Math.max(0, Math.min(10, Math.round(starRank) || 0));
    if (next <= 0) {
      setCatalogOwned(dragon.id, { owned: false });
      return;
    }
    setCatalogOwned(dragon.id, { owned: true, starRank: next });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex h-dvh min-h-0 flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
      data-intro-tutorial=""
      data-intro-step={step}
    >
      {step === "welcome" ? (
        <WelcomeStep
          onAddPit={() => setStep("pit")}
          onSkip={finish}
        />
      ) : (
        <PitStep
          query={query}
          onQuery={setQuery}
          catalog={catalog}
          ownedById={ownedById}
          ownedCount={state.owned.length}
          onStars={setStars}
          onSample={loadSample}
          onSkip={finish}
          onDone={finish}
        />
      )}
    </div>
  );
}

function WelcomeStep({
  onAddPit,
  onSkip,
}: {
  onAddPit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col justify-center overflow-y-auto px-5 py-8">
      <p className="text-label mb-3">Unofficial fan tool</p>
      <h1
        id="intro-title"
        className="font-heading text-3xl tracking-wide text-amber-50 sm:text-4xl"
      >
        Dragonfire Pit
      </h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
        Seat Left, Vanguard, and Right. Complete three-dragon lines appear as
        you pick. Nothing here is affiliated with the game.
      </p>
      <ol className="mt-6 grid grid-cols-3 gap-2 text-center">
        {(["Left", "Vanguard", "Right"] as const).map((seat) => (
          <li
            key={seat}
            className="rounded-xl border border-amber-500/20 bg-card/80 px-2 py-3"
          >
            <span className="mx-auto mb-2 block size-10 rounded-full ring-2 ring-dashed ring-amber-200/30" />
            <span className="text-label">{seat}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Your pit is optional. Stars you set keep suggestions honest. Skip and
        fill it later on Pit if you want.
      </p>
      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-12 flex-1 sm:h-11"
          data-intro-add-pit=""
          onClick={onAddPit}
        >
          Add my pit
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 sm:h-11"
          data-intro-skip=""
          onClick={onSkip}
        >
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function PitStep({
  query,
  onQuery,
  catalog,
  ownedById,
  ownedCount,
  onStars,
  onSample,
  onSkip,
  onDone,
}: {
  query: string;
  onQuery: (value: string) => void;
  catalog: Dragon[];
  ownedById: Map<string, { id: string; starRank: number }>;
  ownedCount: number;
  onStars: (dragon: Dragon, starRank: number) => void;
  onSample: () => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[92rem] flex-1 flex-col overflow-hidden">
      <header className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              id="intro-title"
              className="font-heading text-2xl tracking-wide text-amber-50"
            >
              Your pit
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Optional. Tap + on dragons you hatched. Leave the rest at 0★.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0"
            data-intro-skip=""
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search a name"
            aria-label="Search dragons"
            className="h-11 pl-10 md:h-11"
            data-intro-search=""
          />
        </div>
      </header>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 sm:px-4"
        data-intro-scroll=""
      >
        {catalog.length === 0 ? (
          <p className="px-3 py-8 text-sm text-muted-foreground">
            No dragons match “{query.trim()}”.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-x-1 gap-y-2 p-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
            {catalog.map((dragon) => {
              const owned = ownedById.get(dragon.id);
              const stars = owned?.starRank ?? 0;
              return (
                <div
                  key={dragon.id}
                  className="flex flex-col items-center px-0.5 py-1"
                  data-intro-dragon={dragon.id}
                >
                  <p
                    className={cn(
                      "font-heading mb-1 line-clamp-1 w-full text-center text-[11px] tracking-wide uppercase sm:text-xs",
                      stars > 0 ? "text-amber-50" : "text-muted-foreground",
                    )}
                  >
                    {dragon.name}
                  </p>
                  <DragonIcon
                    dragonId={dragon.id}
                    name={dragon.name}
                    rarity={dragon.rarity}
                    size="xl"
                    dimmed={stars <= 0}
                  />
                  <div className="mt-0.5">
                    <StarStepper
                      size="sm"
                      value={stars}
                      onDelta={(delta) => onStars(dragon, stars + delta)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <footer className="relative z-10 flex shrink-0 flex-wrap items-center gap-2 border-t border-amber-500/20 bg-background px-4 py-3 sm:px-6">
        <p className="text-label mr-auto">
          {ownedCount} owned
        </p>
        {ownedCount === 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            data-intro-sample=""
            onClick={onSample}
          >
            Sample
          </Button>
        ) : null}
        <Button
          type="button"
          className="min-w-40"
          data-intro-done=""
          onClick={onDone}
        >
          Done — build a team
        </Button>
      </footer>
    </div>
  );
}
