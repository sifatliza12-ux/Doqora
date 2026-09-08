"use client";

import Link from "next/link";
import { MenuIcon } from "@/components/ui/icons";

export interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 md:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="rounded-button p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      <Link
        href="/dashboard"
        className="text-sm font-semibold tracking-wide text-foreground"
      >
        Doqora
      </Link>
    </header>
  );
}
