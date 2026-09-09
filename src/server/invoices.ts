import type { Business, BusinessBankAccount, InvoiceStatus, InvoiceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/server/business";

function customerNameFromSnapshot(snapshot: unknown): string {
  if (snapshot && typeof snapshot === "object" && "name" in snapshot) {
    const name = (snapshot as { name?: unknown }).name;
    if (typeof name === "string" && name.trim().length > 0) return name;
  }
  return "—";
}

export interface InvoiceListRow {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  currencyCode: string;
}

export type InvoicesListResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | { status: "ok"; invoices: InvoiceListRow[] };

export async function getInvoicesForCurrentBusiness(): Promise<InvoicesListResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const rows = await prisma.invoice.findMany({
    where: { businessId: current.business.id },
    orderBy: { issueDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      status: true,
      issueDate: true,
      currencyCode: true,
      customerSnapshot: true,
    },
  });

  return {
    status: "ok",
    invoices: rows.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerName: customerNameFromSnapshot(row.customerSnapshot),
      totalAmount: row.totalAmount.toNumber(),
      status: row.status,
      issueDate: row.issueDate.toISOString(),
      currencyCode: row.currencyCode,
    })),
  };
}

export interface InvoiceCustomerOption {
  id: string;
  name: string;
  nameAr: string | null;
  companyName: string | null;
  companyNameAr: string | null;
}

async function getCustomerOptions(businessId: string): Promise<InvoiceCustomerOption[]> {
  return prisma.customer.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, nameAr: true, companyName: true, companyNameAr: true },
  });
}

export interface InvoiceBuilderContext {
  business: Business;
  bankAccount: BusinessBankAccount | null;
  customers: InvoiceCustomerOption[];
}

export type InvoiceBuilderContextResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | { status: "ok"; context: InvoiceBuilderContext };

// Data needed to render the builder in CREATE mode (no existing invoice yet).
export async function getInvoiceBuilderContext(): Promise<InvoiceBuilderContextResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const customers = await getCustomerOptions(current.business.id);

  return {
    status: "ok",
    context: { business: current.business, bankAccount: current.bankAccount, customers },
  };
}

export interface InvoiceDraftLineItem {
  id: string;
  description: string;
  descriptionAr: string;
  quantity: string;
  unit: string;
  rate: string;
  discount: string;
  vatRate: string;
}

export interface InvoiceDraftForEdit {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  issueDate: string;
  dueDate: string;
  notes: string;
  customerId: string | null;
  customerSnapshotName: string | null;
  items: InvoiceDraftLineItem[];
}

export type InvoiceEditResult =
  | { status: "no-organization" }
  | { status: "not-found" }
  | { status: "invoice-not-found" }
  | { status: "not-draft"; invoiceNumber: string; currentStatus: InvoiceStatus }
  | { status: "ok"; context: InvoiceBuilderContext; invoice: InvoiceDraftForEdit };

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Scoped to the current business the same way every other reader is —
// requesting another tenant's invoice id simply finds no row, same as a
// forged customerId in the Customer milestone.
export async function getInvoiceForEdit(invoiceId: string): Promise<InvoiceEditResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: current.business.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) return { status: "invoice-not-found" };
  if (invoice.status !== "DRAFT") {
    return { status: "not-draft", invoiceNumber: invoice.invoiceNumber, currentStatus: invoice.status };
  }

  const customers = await getCustomerOptions(current.business.id);

  return {
    status: "ok",
    context: { business: current.business, bankAccount: current.bankAccount, customers },
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      issueDate: toDateInputValue(invoice.issueDate),
      dueDate: toDateInputValue(invoice.dueDate),
      notes: invoice.notes ?? "",
      customerId: invoice.customerId,
      customerSnapshotName: invoice.customerId ? null : customerNameFromSnapshot(invoice.customerSnapshot),
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        descriptionAr: item.descriptionAr ?? "",
        quantity: item.quantity.toString(),
        unit: item.unit ?? "",
        rate: item.rate.toString(),
        discount: item.discount.toString(),
        vatRate: item.vatRate.toString(),
      })),
    },
  };
}
