"use client";

import { useState } from "react";
import { DragonIcon } from "@/components/dragon-icon";
import { AbilityBlock, StatGrid } from "@/components/dragon-profile";
import { StarRequirement } from "@/components/star-requirement";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { commandLine, dragonKit, star6Ability, vanguardBonus } from "@/lib/habits";
import { healingAbilities } from "@/lib/healing";
import { starGateHint } from "@/lib/stars";
import { breedLabels } from "@/lib/labels";
import { dragonRoles, roleChipClass, roleShort } from "@/lib/roles";
import { scaledStats } from "@/lib/scale-stats";
import type { DragonSuggestion } from "@/lib/suggest";
import type { Dragon, SlotId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function SuggestTile({
  suggestion,
  selected,
  onPick,
  onInspect,
  onSaveNotes,
  kind,
  ignoreLevel,
  rank,
  slot,
  showAbilities,
}: {
  suggestion: DragonSuggestion;
  selected?: boolean;
  onPick: () => void;
  onInspect: () => void;
  onSaveNotes?: (ownedId: string, notes: string) => void;
  kind?: "pit" | "theory";
  ignoreLevel?: boolean;
  rank?: number;
  slot?: SlotId;
  showAbilities?: boolean;
}) {
  const { dragon, owned, reasons, starRank, reignLevel } = suggestion;
  const notesId = owned?.id ?? dragon.id;
  const storedNotes = owned?.notes ?? "";
  const [draft, setDraft] = useState({ id: notesId, notes: storedNotes });
  if (draft.id !== notesId) {
    setDraft({ id: notesId, notes: storedNotes });
  }
  const notes = draft.notes;
  const [open, setOpen] = useState(false);

  const meta =
    kind === "theory"
      ? owned
        ? `Aim ★${starRank}`
        : `★${starRank}`
      : ignoreLevel
        ? `★${starRank}`
        : `★${starRank} · R${reignLevel}`;

  const ownedStars = owned?.starRank ?? null;
  const notesDirty = owned ? notes !== storedNotes : false;
  const synergy = reasons[0];
  const star6 = star6Ability(dragon, true);
  const frontBonus = slot === "vanguard" ? vanguardBonus(dragon, true) : null;
  const kit = dragonKit(dragon);
  const heals = healingAbilities(dragon);
  const showHealLines = heals.length > 0;

  return (
    <div className={cn("min-w-0", selected && "bg-amber-500/20")}>
      <div className="flex min-w-0 items-stretch">
        <button
          type="button"
          onClick={onPick}
          className={cn(
            "flex min-h-11 w-0 min-w-0 flex-1 gap-2 overflow-hidden px-2 py-1.5 text-left select-none active:bg-amber-500/15",
            showAbilities || frontBonus || showHealLines ? "items-start" : "items-center",
          )}
        >
          {rank != null ? (
            <span className="w-4 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
              {rank}
            </span>
          ) : null}
          <DragonIcon
            dragonId={dragon.id}
            name={dragon.name}
            rarity={dragon.rarity}
            custom={dragon.custom}
            selected={selected}
            size="xs"
          />
          <span className="w-0 min-w-0 flex-1 overflow-hidden">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="font-heading truncate text-sm tracking-wide">
                {dragon.name}
              </span>
              {dragonRoles(dragon).map((role) => (
                <span
                  key={role}
                  className={cn(
                    "hidden shrink-0 rounded-full px-1.5 py-px text-[11px] tracking-wide ring-1 min-[380px]:inline",
                    roleChipClass[role],
                  )}
                >
                  {role === "healing" ? (
                    <HealChip dragon={dragon} ownedStars={ownedStars} />
                  ) : (
                    roleShort[role]
                  )}
                </span>
              ))}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {selected ? "Slotted" : meta}
              </span>
            </span>
            {showHealLines
              ? heals.map((heal) => {
                  const line =
                    heal.stars == null
                      ? `Command · ${heal.short}`
                      : `${heal.stars}★ · ${heal.short}`;
                  return (
                    <span
                      key={heal.id}
                      className="mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-snug"
                      title={
                        heal.stars == null
                          ? line
                          : `${line}. ${starGateHint(heal.stars, ownedStars)}`
                      }
                    >
                      {heal.stars == null ? (
                        <span className="min-w-0 truncate">
                          Command · {heal.short}
                        </span>
                      ) : (
                        <>
                          <StarRequirement
                            stars={heal.stars}
                            ownedStars={ownedStars}
                            className="shrink-0"
                          />
                          <span className="min-w-0 truncate">
                            {` · ${heal.short}`}
                          </span>
                        </>
                      )}
                    </span>
                  );
                })
              : null}
            {frontBonus ? (
              <span
                className="compact-line mt-0.5 text-xs leading-snug text-emerald-100"
                title={`Vanguard ${frontBonus}`}
              >
                {`Vanguard ${frontBonus}`}
              </span>
            ) : (
              <span
                className={cn(
                  "compact-line mt-0.5 text-xs",
                  /^(Fills |Gives |Gets )/.test(synergy ?? "")
                    ? "text-emerald-100"
                    : "text-amber-100",
                )}
                title={synergy}
              >
                {synergy}
              </span>
            )}
            {showAbilities ? (
              <>
                <span
                  className="compact-line mt-0.5 text-xs leading-snug text-foreground/90"
                  title={commandLine(dragon, true)}
                >
                  {commandLine(dragon, true)}
                </span>
                {star6 && !heals.some((heal) => heal.stars === 6) ? (
                  <span
                    className="mt-0.5 flex min-w-0 items-center gap-1 text-xs leading-snug text-foreground/75"
                    title={`${star6}. ${starGateHint(6, ownedStars)}`}
                  >
                    <StarRequirement
                      stars={6}
                      ownedStars={ownedStars}
                      className="shrink-0"
                    >
                      6+ stars
                    </StarRequirement>
                    <span className="min-w-0 truncate">{` ${star6}`}</span>
                  </span>
                ) : null}
              </>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={
            open
              ? `Hide details for ${dragon.name}`
              : `Show details for ${dragon.name}`
          }
          className="flex w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn("size-4 transition", open && "rotate-180")}
          />
        </button>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          <div>
            <p className="text-label">With this team</p>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
              {dragonRoles(dragon)
                .map((role) => roleShort[role])
                .join(" · ")}
              {" · "}
              {breedLabels[dragon.breed]}
            </p>
            <ul className="mt-1 space-y-0.5 text-[13px] leading-snug text-amber-100">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          {heals.length > 0 ? (
            <div className="space-y-2">
              <p className="text-label">Healing</p>
              {heals.map((heal) => (
                <p key={heal.id} className="text-[13px] leading-snug">
                  {heal.stars == null ? (
                    <>Command · {heal.short}</>
                  ) : (
                    <>
                      <StarRequirement
                        stars={heal.stars}
                        ownedStars={ownedStars}
                      />
                      {` · ${heal.short}`}
                    </>
                  )}
                </p>
              ))}
            </div>
          ) : null}
          <AbilityBlock
            title={
              heals.some((heal) => heal.stars === null)
                ? "Command · Heal · always on"
                : "Command"
            }
            body={kit.command}
          />
          {kit.extras.map((extra) => (
            <AbilityBlock
              key={extra.title}
              title={
                extra.unlockStars != null ? (
                  <>
                    <span className="text-muted-foreground">
                      {extra.title.replace(/ · \d+★$/, "")}
                    </span>
                    <span className="text-muted-foreground" aria-hidden>
                      ·
                    </span>
                    <StarRequirement
                      stars={extra.unlockStars}
                      ownedStars={ownedStars}
                    />
                  </>
                ) : (
                  extra.title
                )
              }
              body={extra.body}
              ranks={extra.ranks}
            />
          ))}
          <div>
            <p className="text-label">Stats</p>
            <StatGrid
              stats={scaledStats(dragon, starRank, reignLevel)}
              compact
              className="mt-2"
            />
          </div>
          {owned && onSaveNotes ? (
            <div className="space-y-1.5">
              <p className="text-label">Your notes</p>
              <Textarea
                value={notes}
                onChange={(e) =>
                  setDraft({ id: notesId, notes: e.target.value })
                }
                placeholder="Relics, rider, who it pairs with…"
                className="min-h-20 text-sm"
              />
              <Button
                size="sm"
                disabled={!notesDirty}
                onClick={() => {
                  onSaveNotes(owned.id, notes);
                  toast.success(`Notes saved for ${dragon.name}.`);
                }}
              >
                Save notes
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add this dragon to your pit to keep personal notes.
            </p>
          )}
          <Button variant="outline" size="sm" onClick={onInspect}>
            Full stats
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function HealChip({
  dragon,
  ownedStars,
}: {
  dragon: Dragon;
  ownedStars: number | null;
}) {
  const heals = healingAbilities(dragon);
  if (heals.length === 0 || heals.some((heal) => heal.stars === null)) {
    return "Heal";
  }
  const min = Math.min(...heals.map((heal) => heal.stars ?? 1));
  return (
    <span className="inline-flex items-center gap-0.5">
      Heal
      <StarRequirement stars={min} ownedStars={ownedStars} />
    </span>
  );
}
