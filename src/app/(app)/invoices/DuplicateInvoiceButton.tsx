"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { DuplicateIcon } from "@/components/ui/icons";
import { duplicateInvoice } from "@/server/invoice-actions";

// Used both as a compact per-row action (Invoice List) and a full button
// (invoice edit view) — same duplicate-then-navigate behavior either way,
// just different chrome.
export function DuplicateInvoiceButton({
  invoiceId,
  variant = "button",
  onBeforeClick,
}: {
  invoiceId: string;
  variant?: "button" | "icon";
  /** List rows are themselves clickable (navigate to the invoice) — pass a
   * stopPropagation callback so clicking Duplicate doesn't also trigger
   * the row's own navigation. Run synchronously before the click is
   * otherwise handled. */
  onBeforeClick?: (event: React.MouseEvent) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(event: React.MouseEvent) {
    onBeforeClick?.(event);
    setError(null);
    startTransition(async () => {
      const result = await duplicateInvoice(invoiceId);
      if (result.status === "success") {
        router.push(`/invoices/${result.invoiceId}`);
      } else {
        setError(result.message);
      }
    });
  }

  if (variant === "icon") {
    return (
      <IconButton aria-label="Duplicate invoice" onClick={handleClick} disabled={isPending}>
        <DuplicateIcon className="h-4 w-4" />
      </IconButton>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="secondary" onClick={handleClick} disabled={isPending}>
        <DuplicateIcon className="h-4 w-4" />
        {isPending ? "Duplicating…" : "Duplicate"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
