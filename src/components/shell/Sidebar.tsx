import Link from "next/link";
import { NavList } from "./NavList";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[260px] shrink-0 flex-col border-e border-border bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="text-sm font-semibold tracking-wide text-foreground"
        >
          Doqora
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavList />
      </div>
    </aside>
  );
}
