"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copyText, downloadTextFile } from "@/lib/ai/export";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

export function ChatGptExportBar({
  build,
  filename,
  disabled,
}: {
  /** Called only when the player copies, downloads, or opens the preview. */
  build: () => string;
  filename: string;
  disabled?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

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

  return (
    <div>
      <div className="flex flex-wrap gap-2">
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
