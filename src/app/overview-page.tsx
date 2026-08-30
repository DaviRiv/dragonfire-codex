"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AddDragonDialog } from "@/components/add-dragon-dialog";
import { EmptyState } from "@/components/empty-state";
import { LineupCard } from "@/components/lineup-card";
import { Button } from "@/components/ui/button";
import { catalogCount } from "@/data/sample";
import { troopCounters, troopLabels, TROOP_TYPES } from "@/lib/labels";
import { exportPit, isPitState, usePit } from "@/lib/store";
import { Download, Flame, Plus, Swords, Upload, Users } from "lucide-react";
import { toast } from "sonner";

export function OverviewPage() {
  const { ready, state, loadSample, resetPit, importState } = usePit();
  const [addOpen, setAddOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">Lighting the braziers…</p>;
  }

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-950 to-black px-6 py-10 ring-1 ring-amber-500/25 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.18),transparent_50%)]" />
        <div className="relative max-w-2xl">
          <p className="font-heading text-xs tracking-[0.35em] text-amber-200/80">
            UNOFFICIAL FAN TOOL
          </p>
          <h1 className="mt-3 font-heading text-4xl tracking-wide text-amber-50 sm:text-5xl">
            Log your dragons. Form the line.
          </h1>
          <p className="mt-4 text-base text-stone-300">
            A pit for Game of Thrones: Dragonfire. Track the dragons you actually
            hatched, slot them into Left / Vanguard / Right, and group those
            lineups into teams for PvP, rallies, and the keep.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => setAddOpen(true)}>
              <Plus data-icon="inline-start" />
              Add dragons
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/lineups" />}>
              Open lineups
            </Button>
            {state.owned.length === 0 ? (
              <Button variant="secondary" onClick={loadSample}>
                Load sample pit
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Flame className="size-4" />}
          label="Dragons in pit"
          value={state.owned.length}
          href="/pit"
        />
        <StatCard
          icon={<Swords className="size-4" />}
          label="Lineups"
          value={state.lineups.length}
          href="/lineups"
        />
        <StatCard
          icon={<Users className="size-4" />}
          label="Teams"
          value={state.teams.length}
          href="/teams"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-card/60 p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-xl tracking-wide">Troop matchups</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pair a lineup’s troop type to each dragon’s positive affinity. Siege
            loses to every troop but breaks Point of Interest durability.
          </p>
          <ul className="mt-4 space-y-2">
            {TROOP_TYPES.map((troop) => {
              const c = troopCounters[troop];
              return (
                <li
                  key={troop}
                  className="flex flex-col gap-1 rounded-lg bg-black/25 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">{troopLabels[troop]}</span>
                  <span className="text-muted-foreground">
                    {c.beats
                      ? `beats ${troopLabels[c.beats]} · loses to ${troopLabels[c.losesTo!]}`
                      : c.note}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl bg-card/60 p-5 ring-1 ring-foreground/10">
          <h2 className="font-heading text-xl tracking-wide">Your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything stays in this browser. Export a JSON backup before you
            clear storage. Hatchery currently lists {catalogCount()} dragons;
            unlisted names can still be added by hand.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportPit(state)}>
              <Download data-icon="inline-start" />
              Export pit
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload data-icon="inline-start" />
              Import
            </Button>
            <Button variant="destructive" onClick={resetPit}>
              Clear pit
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
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-xl tracking-wide">Recent lineups</h2>
          <Button variant="link" nativeButton={false} render={<Link href="/lineups" />}>
            All lineups
          </Button>
        </div>
        {state.lineups.length === 0 ? (
          <EmptyState
            title="No formations saved"
            description="Slot three dragons and a troop type. Habits that buff a named flank land harder when that dragon is not sitting in that flank."
            action={
              <Button nativeButton={false} render={<Link href="/lineups" />}>
                Start a lineup
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {state.lineups.slice(0, 4).map((lineup) => (
              <LineupCard key={lineup.id} lineup={lineup} state={state} />
            ))}
          </div>
        )}
      </section>
      <AddDragonDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-card/70 p-4 ring-1 ring-foreground/10 transition hover:ring-amber-400/40"
    >
      <div className="flex items-center gap-2 text-amber-200/90">
        {icon}
        <span className="text-xs tracking-[0.2em]">{label.toUpperCase()}</span>
      </div>
      <p className="mt-2 font-heading text-3xl">{value}</p>
    </Link>
  );
}
