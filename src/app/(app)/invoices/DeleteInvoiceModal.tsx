"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteInvoice } from "@/server/invoice-actions";

export interface DeletableInvoice {
  id: string;
  invoiceNumber: string;
}

export function DeleteInvoiceModal({
  invoice,
  onClose,
  onDeleted,
}: {
  invoice: DeletableInvoice | null;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!invoice) return;
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (result.status === "success") {
        onClose();
        onDeleted?.();
      } else {
        setError(result.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <Modal
      isOpen={invoice !== null}
      onClose={onClose}
      title="Delete invoice"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-foreground">
        Delete <span className="font-medium">{invoice?.invoiceNumber}</span>? This can&apos;t be
        undone.
      </p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Modal>
  );
}
