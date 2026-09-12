import { auth } from "@clerk/nextjs/server";
import type { Business, BusinessBankAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CurrentBusinessResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | { status: "ok"; business: Business; bankAccount: BusinessBankAccount | null };

// The current Business is always derived from the session's active Clerk
// Organization (never from anything client-supplied) — this is the single
// place that mapping happens, so every reader/action stays scoped to it.
export async function getCurrentBusiness(): Promise<CurrentBusinessResult> {
  const { orgId } = await auth();
  if (!orgId) return { status: "no-organization" };

  const found = await prisma.business.findUnique({
    where: { clerkOrgId: orgId },
    include: { bankAccounts: true },
  });
  if (!found) return { status: "not-found" };

  const { bankAccounts, ...business } = found;
  return { status: "ok", business, bankAccount: bankAccounts[0] ?? null };
}

// Shared by every 'use server' actions file that mutates business-owned data
// (business-actions.ts, customer-actions.ts, ...) — always re-derives
// businessId from the session, never trusts a client-supplied one.
export async function requireCurrentBusinessId(): Promise<string> {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("No active organization.");
  }

  const business = await prisma.business.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!business) {
    throw new Error("No business found for the active organization.");
  }

  return business.id;
}

// The one OWNER-vs-MEMBER boundary this app enforces: company-wide settings
// (Business Profile, Bank Details) are OWNER-only, everything else (customers,
// invoices, quotes) is open to any member. Reads Clerk's own live orgRole
// claim from the session (default roles "org:admin"/"org:member") rather than
// the BusinessMember.role column — that column is only a point-in-time
// snapshot written at membership-creation time (see webhooks/clerk.ts) and
// would go stale the moment a role changes later via Clerk's own
// OrganizationProfile UI, since no organizationMembership.updated handler
// exists (deliberately — this live check makes one unnecessary).
export async function isCurrentUserOwner(): Promise<boolean> {
  const { orgRole } = await auth();
  return orgRole === "org:admin";
}
