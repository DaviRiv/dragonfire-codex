import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The small uppercase label that titles a region. It was a `<p>` everywhere,
 * which left most pages with a single h1 and no outline at all — so skipping
 * between regions with a screen reader was impossible even though the page
 * looked clearly sectioned. Same pixels, real heading.
 */
export function SectionLabel({
  children,
  as: Tag = "h2",
  className,
  id,
}: {
  children: ReactNode;
  as?: "h2" | "h3" | "h4";
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={cn("text-label", className)}>
      {children}
    </Tag>
  );
}
