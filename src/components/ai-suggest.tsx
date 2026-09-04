"use client";

import { useMemo, useState } from "react";
import { ChatGptExportBar } from "@/components/chatgpt-export";
import { MiniChip } from "@/components/chip";
import { Disclosure } from "@/components/disclosure";
import { OpenAiLogin } from "@/components/openai-login";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  chatgptExportFilename,
  chatgptSuggestExport,
} from "@/lib/ai/export";
import { makeSuggestRequest, type AiLine } from "@/lib/ai/prompt";
import { collectRoster, type AiPool } from "@/lib/ai/roster";
import { useOpenAiSession } from "@/lib/ai/session";
import { findDragon } from "@/lib/dragons";
import { modeShort, troopShort } from "@/lib/labels";
import type { Lineup, PitState } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

export function AiSuggest({
  lineup,
  state,
  onApply,
}: {
  lineup: Lineup;
  state: PitState;
  onApply: (line: AiLine) => void;
}) {
  const defaultPool: AiPool =
    lineup.kind === "pit" && state.owned.length > 0 ? "pit" : "hatchery";
  const [pool, setPool] = useState<AiPool>(defaultPool);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [lines, setLines] = useState<AiLine[]>([]);
  const [source, setSource] = useState<"model" | "local" | null>(null);
  const [via, setVia] = useState<"user" | "env" | null>(null);
  const { session } = useOpenAiSession();

  const roster = useMemo(
    () => collectRoster(state, lineup, pool),
    [state, lineup, pool],
  );
  const request = useMemo(
    () => makeSuggestRequest(lineup, state, pool, roster, note),
    [lineup, state, pool, roster, note],
  );
  const chatgptText = useMemo(() => chatgptSuggestExport(request), [request]);

  async function ask() {
    if (roster.length < 3) {
      toast.error("Need at least three dragons in this pool.");
      return;
    }
    setBusy(true);
    setWarning(null);
    setVia(null);
    try {
      const response = await fetch("/api/ai/suggest-teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.apiKey
            ? { Authorization: `Bearer ${session.apiKey}` }
            : {}),
        },
        body: JSON.stringify(request),
      });
      const json = (await response.json()) as {
        lines?: AiLine[];
        source?: "model" | "local";
        via?: "user" | "env";
        warning?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error || "Ask AI failed.");
      }
      setLines(json.lines ?? []);
      setSource(json.source ?? null);
      setVia(json.via ?? null);
      setWarning(json.warning ?? null);
      if (json.source === "model") {
        toast.success("AI combinations ready.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ask AI failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Disclosure
      title="Ask AI"
      badge={pool === "pit" ? `Pit · ${roster.length}` : `Hatchery · ${roster.length}`}
    >
      <p className="text-[13px] leading-snug text-muted-foreground">
        Fills a template with this roster and asks for 2–3 lines. Pit is every
        dragon you own. Hatchery is the full catalog. Log in with an OpenAI
        key to run the model here, or copy the ChatGPT text and paste it at
        chatgpt.com.
      </p>
      <OpenAiLogin />
      {request.skipUsed ? (
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
          Skip other teams is on — the whole pit still goes in the prompt, with
          an on: tag for anyone already seated elsewhere.
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        <MiniChip
          active={pool === "pit"}
          onClick={() => {
            setPool("pit");
            setLines([]);
            setSource(null);
            setVia(null);
            setWarning(null);
          }}
        >
          Pit
        </MiniChip>
        <MiniChip
          active={pool === "hatchery"}
          onClick={() => {
            setPool("hatchery");
            setLines([]);
            setSource(null);
            setVia(null);
            setWarning(null);
          }}
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
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => void ask()}
          disabled={busy || roster.length < 3}
        >
          <Sparkles data-icon="inline-start" />
          {busy ? "Asking…" : "Suggest combinations"}
        </Button>
      </div>
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
      {warning ? (
        <p className="mt-2 text-[13px] leading-snug text-amber-100">
          {warning} Copy for ChatGPT and paste into chatgpt.com if the API is
          out of quota.
        </p>
      ) : null}
      {source === "model" ? (
        <p className="mt-2 text-[13px] text-emerald-200">
          {via === "user"
            ? "From your OpenAI key."
            : via === "env"
              ? "From the server OpenAI key."
              : "From the model."}
        </p>
      ) : null}
      {lines.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {lines.map((line, index) => (
            <li
              key={`${line.vanguard}-${line.left}-${line.right}-${index}`}
              className="rounded-xl px-2.5 py-2 ring-1 ring-foreground/10"
            >
              <p className="font-medium text-[13px] leading-snug">
                {line.name}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {troopShort[line.troop]} · {modeShort[line.mode]}
                </span>
              </p>
              <p className="mt-0.5 text-[13px] leading-snug">
                {(
                  [
                    ["L", line.left],
                    ["V", line.vanguard],
                    ["R", line.right],
                  ] as const
                )
                  .map(
                    ([slot, id]) =>
                      `${slot} ${findDragon(id, state.customDragons)?.name ?? id}`,
                  )
                  .join(" · ")}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-foreground/80">
                {line.why}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onApply(line)}
              >
                Apply
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Disclosure>
  );
}
