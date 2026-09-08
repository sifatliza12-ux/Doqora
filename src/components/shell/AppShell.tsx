"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { MobileDrawer } from "./MobileDrawer";
import { MobileHeader } from "./MobileHeader";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
