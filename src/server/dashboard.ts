import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/server/business";

export interface DashboardRecentInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  status: InvoiceStatus;
}

export type DashboardResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | {
      status: "ok";
      currencyCode: string;
      revenue: number;
      outstanding: number;
      paidCount: number;
      overdueCount: number;
      recentInvoices: DashboardRecentInvoice[];
    };

// customerSnapshot is an immutable Json blob taken at invoice-creation time
// (see schema.prisma) — the customer's display name always comes from here,
// never from a live join to Customer, which may have since changed or been
// deleted.
function customerNameFromSnapshot(snapshot: unknown): string {
  if (snapshot && typeof snapshot === "object" && "name" in snapshot) {
    const name = (snapshot as { name?: unknown }).name;
    if (typeof name === "string" && name.trim().length > 0) return name;
  }
  return "—";
}

export async function getDashboardData(): Promise<DashboardResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const businessId = current.business.id;

  const [revenueAgg, outstandingAgg, paidCount, overdueCount, recentInvoices] = await Promise.all([
    prisma.invoice.aggregate({
      where: { businessId, status: "PAID" },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.aggregate({
      where: { businessId, status: { in: ["SENT", "OVERDUE"] } },
      _sum: { totalAmount: true },
    }),
    prisma.invoice.count({ where: { businessId, status: "PAID" } }),
    prisma.invoice.count({ where: { businessId, status: "OVERDUE" } }),
    prisma.invoice.findMany({
      where: { businessId },
      orderBy: { issueDate: "desc" },
      take: 5,
      select: { id: true, invoiceNumber: true, totalAmount: true, status: true, customerSnapshot: true },
    }),
  ]);

  return {
    status: "ok",
    currencyCode: current.business.currencyCode,
    revenue: revenueAgg._sum.totalAmount?.toNumber() ?? 0,
    outstanding: outstandingAgg._sum.totalAmount?.toNumber() ?? 0,
    paidCount,
    overdueCount,
    recentInvoices: recentInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: customerNameFromSnapshot(invoice.customerSnapshot),
      totalAmount: invoice.totalAmount.toNumber(),
      status: invoice.status,
    })),
  };
}
