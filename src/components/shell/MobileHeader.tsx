"use client";

import Link from "next/link";
import { IconButton } from "@/components/ui/IconButton";
import { MenuIcon } from "@/components/ui/icons";

export interface MobileHeaderProps {
  onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 md:hidden">
      <IconButton onClick={onMenuClick} aria-label="Open navigation menu">
        <MenuIcon className="h-5 w-5" />
      </IconButton>
      <Link
        href="/dashboard"
        className="text-sm font-semibold tracking-wide text-foreground"
      >
        Doqora
      </Link>
    </header>
  );
}
