"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useOpenAiAvailable } from "@/lib/use-openai-available";
import { copyText, downloadTextFile } from "@/lib/ai/export";
import { accountHref } from "@/components/account-gate";
import { Copy, Download, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export function ChatGptExportBar({
  build,
  filename,
  disabled,
}: {
  /** Called only when the player copies, downloads, previews, or asks. */
  build: () => string;
  filename: string;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const openAi = useOpenAiAvailable();
  const [preview, setPreview] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function copy() {
    const text = build();
    const ok = await copyText(text);
    if (ok) {
      toast.success("Copied. Paste into chatgpt.com.");
      return;
    }
    setPreview(text);
    toast.error("Could not copy. Select the preview below.");
  }

  function download() {
    downloadTextFile(filename, build());
    toast.success(`Saved ${filename}`);
  }

  async function askServer() {
    if (asking || disabled) return;
    if (!user) {
      toast.error("Sign in to ask ChatGPT from this app.");
      return;
    }
    setAsking(true);
    setAnswer(null);
    try {
      const data = await apiJson<{ reply: string }>("/api/openai/complete", {
        method: "POST",
        body: JSON.stringify({ prompt: build() }),
      });
      setAnswer(data.reply);
      toast.success("ChatGPT answered.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ChatGPT request failed.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {openAi ? (
          user ? (
            <Button
              size="sm"
              variant="default"
              onClick={() => void askServer()}
              disabled={disabled || asking}
            >
              {asking ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              Ask ChatGPT
            </Button>
          ) : (
            <Link
              href={accountHref(pathname || "/")}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground"
            >
              <Sparkles className="size-3.5" />
              Sign in to ask ChatGPT
            </Link>
          )
        ) : null}
        <Button
          size="sm"
          variant="outline"
          onClick={() => void copy()}
          disabled={disabled}
        >
          <Copy data-icon="inline-start" />
          Copy for ChatGPT
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={download}
          disabled={disabled}
        >
          <Download data-icon="inline-start" />
          Export .txt
        </Button>
      </div>
      {openAi === false ? (
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          No API key on the server — copy the prompt to chatgpt.com. Add{" "}
          <span className="font-mono text-[11px]">OPENAI_API_KEY</span> in Cursor
          app secrets to enable Ask ChatGPT here.
        </p>
      ) : null}
      {answer ? (
        <AnswerPanel text={answer} onClear={() => setAnswer(null)} />
      ) : null}
      <details
        className="mt-2"
        open={preview != null}
        onToggle={(event) => {
          setPreview(event.currentTarget.open ? build() : null);
        }}
      >
        <summary className="cursor-pointer text-[13px] text-muted-foreground">
          Preview ChatGPT text
        </summary>
        <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-[11px] leading-snug text-foreground/80">
          {preview ?? ""}
        </pre>
      </details>
    </div>
  );
}

function AnswerPanel({
  text,
  onClear,
}: {
  text: string;
  onClear: () => void;
}) {
  return (
    <div className="mt-2 rounded-lg surface-sunken p-2 ring-1 ring-foreground/10">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-label">ChatGPT</p>
        <button
          type="button"
          className="text-ui-sm text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          Dismiss
        </button>
      </div>
      <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-[13px] leading-snug text-foreground/90">
        {text}
      </p>
    </div>
  );
}