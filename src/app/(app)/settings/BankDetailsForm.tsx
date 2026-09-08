"use client";

import { useActionState } from "react";
import type { BusinessBankAccount } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { type BankDetailsState, updateBankAccount } from "@/server/business-actions";

const initialState: BankDetailsState = { status: "idle" };

export function BankDetailsForm({ bankAccount }: { bankAccount: BusinessBankAccount | null }) {
  const [state, formAction, pending] = useActionState(updateBankAccount, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormSection title="Bank Details">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Bank name"
            name="bankName"
            defaultValue={bankAccount?.bankName ?? ""}
            required
          />
          <Input
            label="Account name"
            name="accountName"
            defaultValue={bankAccount?.accountName ?? ""}
            required
          />
          <Input
            label="Account number"
            name="accountNumber"
            defaultValue={bankAccount?.accountNumber ?? ""}
            required
          />
          <Input label="IBAN" name="iban" defaultValue={bankAccount?.iban ?? ""} required />
          <Input label="Swift code" name="swiftCode" defaultValue={bankAccount?.swiftCode ?? ""} />
        </div>
      </FormSection>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save bank details"}
        </Button>
        {state.status === "success" && <p className="text-sm text-success">{state.message}</p>}
        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      </div>
    </form>
  );
}
