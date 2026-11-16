"use client";

import type { ComponentProps, KeyboardEventHandler } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export function SearchField({
  id,
  value,
  onChange,
  onKeyDown,
  label,
  className,
  inputClassName,
  ...inputProps
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  label: string;
  className?: string;
  inputClassName?: string;
} & Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "placeholder" | "aria-label" | "className"
>) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 z-[1] size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        {...inputProps}
        id={id}
        type="search"
        value={value}
        placeholder=""
        aria-label={label}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className={cn(
          // The native cancel button would sit beside our own clear button.
          "h-9 pl-9 md:h-8 md:pl-9 [&::-webkit-search-cancel-button]:hidden",
          value && "pr-9",
          inputClassName,
        )}
      />
      {/* Clearing a filter by selecting the text and deleting it is a chore on
          a phone, and leaving a stale query is the usual cause of an
          inexplicably empty list. */}
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="tap absolute top-1/2 right-1 z-[1] inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
