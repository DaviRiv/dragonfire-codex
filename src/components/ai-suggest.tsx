"use client";

import { useMemo, useState } from "react";
import { ChatGptExportBar } from "@/components/chatgpt-export";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { MetaCard } from "@/components/meta-card";
import { Textarea } from "@/components/ui/textarea";
import {
  chatgptExportFilename,
  chatgptSuggestExport,
} from "@/lib/ai/export";
import { makeSuggestRequest } from "@/lib/ai/prompt";
import { collectRoster, type AiPool } from "@/lib/ai/roster";
import type { Lineup, PitState } from "@/lib/types";

export function ChatGptAsk({
  lineup,
  state,
}: {
  lineup: Lineup;
  state: PitState;
}) {
  const defaultPool: AiPool =
    lineup.kind === "pit" && state.owned.length > 0 ? "pit" : "hatchery";
  const [pool, setPool] = useState<AiPool>(defaultPool);
  const [note, setNote] = useState("");

  const roster = useMemo(
    () => collectRoster(state, lineup, pool),
    [state, lineup, pool],
  );
  const request = useMemo(
    () => makeSuggestRequest(lineup, state, pool, roster, note),
    [lineup, state, pool, roster, note],
  );
  const chatgptText = useMemo(() => chatgptSuggestExport(request), [request]);

  return (
    <Disclosure
      title="ChatGPT"
      badge={
        pool === "pit" ? `Pit · ${roster.length}` : `Hatchery · ${roster.length}`
      }
    >
      <p className="text-[13px] leading-snug text-muted-foreground">
        Copy a filled prompt with this roster and paste it at chatgpt.com.
        The paste includes the current online meta (Malachite / Vhagar /
        Venator). There is no API key and nothing is sent from this app.
      </p>
      <div className="mt-2">
        <MetaCard />
      </div>
      {request.skipUsed ? (
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
          Skip other teams is on — the whole pit still goes in the prompt, with
          an on: tag for anyone already seated elsewhere.
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <MiniChip active={pool === "pit"} onClick={() => setPool("pit")}>
          Pit
        </MiniChip>
        <MiniChip
          active={pool === "hatchery"}
          onClick={() => setPool("hatchery")}
        >
          Hatchery
        </MiniChip>
      </div>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional: spear rally, skip Vhagar, need a healer…"
        className="mt-2 min-h-16 text-[13px]"
        maxLength={500}
      />
      <div className="mt-2">
        <ChatGptExportBar
          text={chatgptText}
          filename={chatgptExportFilename("suggest", pool)}
          disabled={roster.length === 0}
        />
      </div>
      {roster.length < 3 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          {pool === "pit"
            ? "Log at least three dragons in the pit, or switch to Hatchery."
            : "Hatchery did not load three dragons."}
        </p>
      ) : null}
    </Disclosure>
  );
}
