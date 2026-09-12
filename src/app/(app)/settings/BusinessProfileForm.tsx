"use client";

import { useActionState } from "react";
import type { Business } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { type BusinessProfileState, updateBusinessProfile } from "@/server/business-actions";

const initialState: BusinessProfileState = { status: "idle" };

export function BusinessProfileForm({ business, isOwner }: { business: Business; isOwner: boolean }) {
  const [state, formAction, pending] = useActionState(updateBusinessProfile, initialState);
  const disabled = !isOwner;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {!isOwner && (
        <p className="text-sm text-muted-foreground">
          Only the business owner can edit the business profile.
        </p>
      )}
      <FormSection title="Company Information">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Business name" name="name" defaultValue={business.name} required disabled={disabled} />
          <Input
            label="Business name (Arabic)"
            name="nameAr"
            defaultValue={business.nameAr ?? ""}
            dir="rtl"
            disabled={disabled}
          />
          <div className="col-span-2">
            <Input label="Address" name="address" defaultValue={business.address ?? ""} disabled={disabled} />
          </div>
          <div className="col-span-2">
            <Input
              label="Address (Arabic)"
              name="addressAr"
              defaultValue={business.addressAr ?? ""}
              dir="rtl"
              disabled={disabled}
            />
          </div>
          <Input label="City" name="city" defaultValue={business.city ?? ""} disabled={disabled} />
          <Input label="Country" name="country" defaultValue={business.country ?? ""} disabled={disabled} />
          <Input label="Phone" name="phone" type="tel" defaultValue={business.phone ?? ""} disabled={disabled} />
          <Input label="Email" name="email" type="email" defaultValue={business.email ?? ""} disabled={disabled} />
          <div className="col-span-2">
            <Input label="Website" name="website" defaultValue={business.website ?? ""} disabled={disabled} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Registration">
        <div className="grid grid-cols-2 gap-4">
          <Input label="CR number" name="crNumber" defaultValue={business.crNumber ?? ""} disabled={disabled} />
          <Input label="VAT number" name="vatNumber" defaultValue={business.vatNumber ?? ""} disabled={disabled} />
          <div className="col-span-2">
            <Input
              label="Business activity"
              name="businessActivity"
              defaultValue={business.businessActivity ?? ""}
              disabled={disabled}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Invoice Settings">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Invoice prefix"
            name="invoicePrefix"
            defaultValue={business.invoicePrefix}
            disabled={disabled}
          />
          <Input
            label="Next invoice number"
            defaultValue={business.nextInvoiceNumber}
            disabled
          />
          <Input
            label="Currency code"
            name="currencyCode"
            defaultValue={business.currencyCode}
            disabled={disabled}
          />
          <Select
            label="Default language mode"
            name="defaultLanguageMode"
            defaultValue={business.defaultLanguageMode}
            disabled={disabled}
          >
            <option value="ENGLISH">English</option>
            <option value="ARABIC">Arabic</option>
            <option value="BILINGUAL">Bilingual</option>
          </Select>
        </div>
      </FormSection>

      {isOwner && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save business profile"}
          </Button>
          {state.status === "success" && <p className="text-sm text-success">{state.message}</p>}
          {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
        </div>
      )}
    </form>
  );
}
