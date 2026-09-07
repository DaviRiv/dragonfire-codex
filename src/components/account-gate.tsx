"use client";

import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function accountHref(next: string): string {
  return `/account?next=${encodeURIComponent(next)}`;
}

export function AccountGate({
  next,
  title,
  description,
  children,
}: {
  next: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { ready, user } = useAuth();
  if (!ready) {
    return <p className="text-sm text-muted-foreground">Checking your account…</p>;
  }
  if (!user) {
    return (
      <EmptyState
        title={title}
        description={description}
        action={
          <div className="grid w-full max-w-sm gap-2">
            <Link href={accountHref(next)} className={cn(buttonVariants())}>
              Register an account
            </Link>
            <Link
              href={accountHref(next)}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Sign in
            </Link>
          </div>
        }
      />
    );
  }
  return children;
}
