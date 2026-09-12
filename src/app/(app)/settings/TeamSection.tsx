"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { FormSection } from "@/components/ui/FormSection";

// Clerk's own <OrganizationProfile /> rather than a hand-built member list —
// Clerk already owns invite emails, pending invitations, role assignment,
// and removal for its Organizations, and its own permission model already
// restricts those actions to admins (a MEMBER viewing this sees the list
// read-only, no separate gating needed from us here). Building a parallel
// invite/remove UI backed by the lower-level invitation APIs would just be
// reimplementing what this component already does correctly.
export function TeamSection() {
  return (
    <FormSection
      title="Team"
      description="Invite people to work in this business together. Only the business owner can invite, remove, or change roles."
    >
      <OrganizationProfile />
    </FormSection>
  );
}
