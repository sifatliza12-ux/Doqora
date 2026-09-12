"use client";

import { useActionState } from "react";
import type { BusinessBankAccount } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { type BankDetailsState, updateBankAccount } from "@/server/business-actions";

const initialState: BankDetailsState = { status: "idle" };

export function BankDetailsForm({
  bankAccount,
  isOwner,
}: {
  bankAccount: BusinessBankAccount | null;
  isOwner: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateBankAccount, initialState);
  const disabled = !isOwner;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {!isOwner && (
        <p className="text-sm text-muted-foreground">Only the business owner can edit bank details.</p>
      )}
      <FormSection title="Bank Details">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Bank name"
            name="bankName"
            defaultValue={bankAccount?.bankName ?? ""}
            required
            disabled={disabled}
          />
          <Input
            label="Account name"
            name="accountName"
            defaultValue={bankAccount?.accountName ?? ""}
            required
            disabled={disabled}
          />
          <Input
            label="Account number"
            name="accountNumber"
            defaultValue={bankAccount?.accountNumber ?? ""}
            required
            disabled={disabled}
          />
          <Input label="IBAN" name="iban" defaultValue={bankAccount?.iban ?? ""} required disabled={disabled} />
          <Input
            label="Swift code"
            name="swiftCode"
            defaultValue={bankAccount?.swiftCode ?? ""}
            disabled={disabled}
          />
        </div>
      </FormSection>

      {isOwner && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save bank details"}
          </Button>
          {state.status === "success" && <p className="text-sm text-success">{state.message}</p>}
          {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
        </div>
      )}
    </form>
  );
}
