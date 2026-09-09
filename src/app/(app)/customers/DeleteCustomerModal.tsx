"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { deleteCustomer } from "@/server/customer-actions";
import type { CustomerWithStats } from "@/server/customers";

export function DeleteCustomerModal({
  customer,
  onClose,
}: {
  customer: CustomerWithStats | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!customer) return;
    startTransition(async () => {
      const result = await deleteCustomer(customer.id);
      if (result.status === "success") {
        onClose();
      } else {
        setError(result.message ?? "Something went wrong.");
      }
    });
  }

  return (
    <Modal
      isOpen={customer !== null}
      onClose={onClose}
      title="Delete customer"
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
        Delete <span className="font-medium">{customer?.name}</span>? This can&apos;t be undone.
      </p>
      {customer && customer.invoiceCount > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          This customer has {customer.invoiceCount} invoice{customer.invoiceCount === 1 ? "" : "s"}.
          They&apos;ll remain, but will no longer be linked to this customer.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Modal>
  );
}
