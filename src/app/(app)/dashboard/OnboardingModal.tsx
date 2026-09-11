"use client";

import { useActionState, useState, useTransition } from "react";
import type { Business } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  type BusinessProfileState,
  dismissOnboarding,
  updateBusinessProfile,
} from "@/server/business-actions";

const initialState: BusinessProfileState = { status: "idle" };
const FORM_ID = "onboarding-profile-form";

// Thin wrapper around the same fields/action as the full Business Profile
// form in Settings (src/app/(app)/settings/BusinessProfileForm.tsx) — a
// smaller subset (no business activity, invoice prefix, or language mode)
// aimed at getting a brand-new business to the minimum useful profile, not
// a parallel form. Settings remains where the rest gets filled in later.
export function OnboardingModal({ business }: { business: Business }) {
  const [dismissed, setDismissed] = useState(false);
  const [state, formAction, isSaving] = useActionState(updateBusinessProfile, initialState);
  const [isSkipping, startSkipTransition] = useTransition();

  // Derived directly from render, not synced via an effect: open unless the
  // user explicitly skipped, or the save action just reported success.
  const isOpen = !dismissed && state.status !== "success";

  function handleSkip() {
    startSkipTransition(async () => {
      await dismissOnboarding();
      setDismissed(true);
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleSkip}
      title="Welcome to Doqora — set up your business profile"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={handleSkip} disabled={isSkipping || isSaving}>
            Skip for now
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSaving || isSkipping}>
            {isSaving ? "Saving…" : "Save & Continue"}
          </Button>
        </>
      }
    >
      <p className="mb-6 text-sm text-muted-foreground">
        This information appears on every invoice you send. You can always finish or
        change it later from Settings.
      </p>
      <form id={FORM_ID} action={formAction} className="flex flex-col gap-6">
        <FormSection title="Company Information">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Business name" name="name" defaultValue={business.name} required />
            <Input
              label="Business name (Arabic)"
              name="nameAr"
              defaultValue={business.nameAr ?? ""}
              dir="rtl"
            />
            <div className="col-span-2">
              <Input label="Address" name="address" defaultValue={business.address ?? ""} />
            </div>
            <div className="col-span-2">
              <Input
                label="Address (Arabic)"
                name="addressAr"
                defaultValue={business.addressAr ?? ""}
                dir="rtl"
              />
            </div>
            <Input label="City" name="city" defaultValue={business.city ?? ""} />
            <Input label="Country" name="country" defaultValue={business.country ?? ""} />
            <Input label="Phone" name="phone" type="tel" defaultValue={business.phone ?? ""} />
            <Input label="Email" name="email" type="email" defaultValue={business.email ?? ""} />
            <div className="col-span-2">
              <Input label="Website" name="website" defaultValue={business.website ?? ""} />
            </div>
          </div>
        </FormSection>

        <FormSection title="Registration">
          <div className="grid grid-cols-2 gap-4">
            <Input label="CR number" name="crNumber" defaultValue={business.crNumber ?? ""} />
            <Input label="VAT number" name="vatNumber" defaultValue={business.vatNumber ?? ""} />
          </div>
        </FormSection>

        <FormSection title="Invoice Settings">
          <Input label="Currency code" name="currencyCode" defaultValue={business.currencyCode} />
        </FormSection>

        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      </form>
    </Modal>
  );
}
