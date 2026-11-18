"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeamBuilderDialog } from "@/components/team-builder-dialog";
import { Button } from "@/components/ui/button";
import {
  teamSeedFromSearch,
  type TeamBuilderSeed,
} from "@/lib/team-builder-seed";
import { Swords } from "lucide-react";

export function CoachTeamBuilderButton({
  className,
  onOpen,
}: {
  className?: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const search = useSearchParams();

  const seed = useMemo(
    () => teamSeedFromSearch(search),
    [search],
  );

  const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);

  const shouldAutoOpen =
    search.get("build") === "1" ||
    Boolean(search.get("l") || search.get("v") || search.get("r") || search.get("dragon"));
  const query = search.toString();
  const isOpen = open || (shouldAutoOpen && dismissedQuery !== query);

  const clearBuildQuery = useCallback(() => {
    if (!shouldAutoOpen && !search.get("build")) return;
    router.replace("/coach", { scroll: false });
  }, [router, search, shouldAutoOpen]);

  function handleOpen(next: boolean) {
    setOpen(next);
    onOpen?.();
    if (!next) {
      setDismissedQuery(query);
      clearBuildQuery();
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        data-open-team-builder
        onClick={() => handleOpen(true)}
      >
        <Swords data-icon="inline-start" className="size-3.5" />
        Build team
      </Button>
      <TeamBuilderDialog
        open={isOpen}
        onOpenChange={handleOpen}
        seed={seed as TeamBuilderSeed | null}
      />
    </>
  );
}