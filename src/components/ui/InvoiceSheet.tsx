import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * The invoice document "paper" — always light and unrounded, regardless of
 * the app's dark theme. Renders on the dark workspace to create Doqora's
 * "paper on a dark desk" effect. `dir="ltr"` is pinned here (not inherited)
 * because the document's layout is fixed by design, independent of the
 * app UI's active language/direction.
 */
export function InvoiceSheet({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      dir="ltr"
      className={cn(
        "overflow-hidden rounded-sheet bg-sheet-background text-sheet-foreground shadow-sheet",
        className
      )}
      {...props}
    />
  );
}
