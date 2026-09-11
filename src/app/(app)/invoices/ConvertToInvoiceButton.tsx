"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { convertQuoteToInvoice } from "@/server/invoice-actions";

// Only rendered by the builder for a quotation that hasn't been converted
// yet (see InvoiceBuilder.tsx) — navigates straight to the new invoice on
// success, same pattern as DuplicateInvoiceButton.
export function ConvertToInvoiceButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await convertQuoteToInvoice(quoteId);
      if (result.status === "success") {
        router.push(`/invoices/${result.invoiceId}`);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? "Converting…" : "Convert to Invoice"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
