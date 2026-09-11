import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/server/business";

// Only these statuses represent a real, finalized tax event — DRAFT hasn't
// been issued yet, CANCELLED was voided and shouldn't count toward VAT owed.
const TAXABLE_STATUSES: InvoiceStatus[] = ["SENT", "PAID", "OVERDUE"];

function customerNameFromSnapshot(snapshot: unknown): string {
  if (snapshot && typeof snapshot === "object" && "name" in snapshot) {
    const name = (snapshot as { name?: unknown }).name;
    if (typeof name === "string" && name.trim().length > 0) return name;
  }
  return "—";
}

export interface TaxReportInvoiceRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

export interface TaxReportTotals {
  invoiceCount: number;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
}

export type TaxReportResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | {
      status: "ok";
      currencyCode: string;
      totals: TaxReportTotals;
      invoices: TaxReportInvoiceRow[];
    };

// `to` is an exclusive upper bound (the caller passes the day *after* the
// last day to include) — see src/lib/tax-report-period.ts.
export async function getTaxReportData(from: Date, to: Date): Promise<TaxReportResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const businessId = current.business.id;
  const where = {
    businessId,
    status: { in: TAXABLE_STATUSES },
    issueDate: { gte: from, lt: to },
  };

  const [aggregate, rows] = await Promise.all([
    prisma.invoice.aggregate({
      where,
      _count: true,
      _sum: { subtotal: true, vatAmount: true, totalAmount: true },
    }),
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        status: true,
        subtotal: true,
        vatAmount: true,
        totalAmount: true,
        customerSnapshot: true,
      },
    }),
  ]);

  return {
    status: "ok",
    currencyCode: current.business.currencyCode,
    totals: {
      invoiceCount: aggregate._count,
      subtotal: aggregate._sum.subtotal?.toNumber() ?? 0,
      vatAmount: aggregate._sum.vatAmount?.toNumber() ?? 0,
      totalAmount: aggregate._sum.totalAmount?.toNumber() ?? 0,
    },
    invoices: rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerName: customerNameFromSnapshot(row.customerSnapshot),
      issueDate: row.issueDate.toISOString(),
      status: row.status,
      subtotal: row.subtotal.toNumber(),
      vatAmount: row.vatAmount.toNumber(),
      totalAmount: row.totalAmount.toNumber(),
    })),
  };
}
