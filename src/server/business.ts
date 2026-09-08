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
