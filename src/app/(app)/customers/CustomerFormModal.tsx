"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { type CustomerFormState, createCustomer, updateCustomer } from "@/server/customer-actions";
import type { CustomerWithStats } from "@/server/customers";

const initialState: CustomerFormState = { status: "idle" };

export function CustomerFormModal({
  mode,
  customer,
  isOpen,
  onClose,
}: {
  mode: "create" | "edit";
  customer?: CustomerWithStats | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const action = mode === "create" ? createCustomer : updateCustomer;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
    }
    // Only react to a fresh success from THIS submission — onClose is
    // intentionally excluded so re-opening the modal doesn't re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "New customer" : "Edit customer"}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <form id="customer-form" action={formAction} className="flex flex-col gap-6">
        {mode === "edit" && <input type="hidden" name="customerId" value={customer?.id ?? ""} />}

        <FormSection title="Basic Info">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" name="name" defaultValue={customer?.name ?? ""} required />
            <Input label="Name (Arabic)" name="nameAr" defaultValue={customer?.nameAr ?? ""} dir="rtl" />
            <Input
              label="Company name"
              name="companyName"
              defaultValue={customer?.companyName ?? ""}
            />
            <Input
              label="Company name (Arabic)"
              name="companyNameAr"
              defaultValue={customer?.companyNameAr ?? ""}
              dir="rtl"
            />
          </div>
        </FormSection>

        <FormSection title="Registration">
          <div className="grid grid-cols-2 gap-4">
            <Input label="VAT number" name="vatNumber" defaultValue={customer?.vatNumber ?? ""} />
            <Input label="CR number" name="crNumber" defaultValue={customer?.crNumber ?? ""} />
          </div>
        </FormSection>

        <FormSection title="Contact">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" name="phone" type="tel" defaultValue={customer?.phone ?? ""} />
            <Input label="Email" name="email" type="email" defaultValue={customer?.email ?? ""} />
          </div>
        </FormSection>

        <FormSection title="Address">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Address" name="address" defaultValue={customer?.address ?? ""} />
            </div>
            <div className="col-span-2">
              <Input
                label="Address (Arabic)"
                name="addressAr"
                defaultValue={customer?.addressAr ?? ""}
                dir="rtl"
              />
            </div>
            <Input label="City" name="city" defaultValue={customer?.city ?? ""} />
            <Input label="Country" name="country" defaultValue={customer?.country ?? ""} />
            <Input label="P.O. Box" name="poBox" defaultValue={customer?.poBox ?? ""} />
          </div>
        </FormSection>

        <FormSection title="Notes">
          <Textarea name="notes" defaultValue={customer?.notes ?? ""} />
        </FormSection>

        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      </form>
    </Modal>
  );
}
