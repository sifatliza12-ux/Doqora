import type { Customer } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/server/business";

export type CustomerWithStats = Customer & {
  invoiceCount: number;
  hasOverdueInvoice: boolean;
};

export type CustomersListResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | { status: "ok"; customers: CustomerWithStats[] };

// Customer has no "status" field in the schema — Active/Overdue is computed
// from its invoices, not stored: Overdue if any invoice is OVERDUE, Active
// if it has invoices but none overdue, otherwise no status.
export async function getCustomersForCurrentBusiness(): Promise<CustomersListResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const rows = await prisma.customer.findMany({
    where: { businessId: current.business.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { invoices: true } },
      invoices: { where: { status: "OVERDUE" }, select: { id: true }, take: 1 },
    },
  });

  const customers: CustomerWithStats[] = rows.map(({ _count, invoices, ...customer }) => ({
    ...customer,
    invoiceCount: _count.invoices,
    hasOverdueInvoice: invoices.length > 0,
  }));

  return { status: "ok", customers };
}
