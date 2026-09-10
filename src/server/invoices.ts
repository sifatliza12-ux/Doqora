import type { Business, BusinessBankAccount, InvoiceStatus, InvoiceType } from "@prisma/client";
import { amountToWords, type AmountInWords } from "@/lib/amount-in-words";
import type { CalculatedInvoice } from "@/lib/invoice-calculations";
import { buildInvoiceQrPayload } from "@/lib/invoice-qr";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/server/business";
import type { LineItemDraft } from "@/app/(app)/invoices/line-item-draft";

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
  status: InvoiceStatus;
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
  | { status: "ok"; context: InvoiceBuilderContext; invoice: InvoiceDraftForEdit };

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Scoped to the current business the same way every other reader is —
// requesting another tenant's invoice id simply finds no row, same as a
// forged customerId in the Customer milestone. Returns invoices of any
// status now (not just DRAFT) — the builder itself decides what's
// editable based on `invoice.status`, since a sent/paid/cancelled invoice
// is still viewable/printable, just read-only.
export async function getInvoiceForEdit(invoiceId: string): Promise<InvoiceEditResult> {
  const current = await getCurrentBusiness();
  if (current.status !== "ok") return current;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: current.business.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) return { status: "invoice-not-found" };

  const customers = await getCustomerOptions(current.business.id);

  return {
    status: "ok",
    context: { business: current.business, bankAccount: current.bankAccount, customers },
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
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

function customerDisplayFromSnapshot(snapshot: unknown): { name: string; nameAr: string } {
  const record = snapshot && typeof snapshot === "object" ? (snapshot as Record<string, unknown>) : {};
  const str = (v: unknown) => (typeof v === "string" && v.trim().length > 0 ? v : undefined);
  return {
    name: str(record.companyName) ?? str(record.name) ?? "—",
    nameAr: str(record.companyNameAr) ?? str(record.nameAr) ?? "",
  };
}

export interface InvoiceForPrint {
  business: Business;
  bankAccount: BusinessBankAccount | null;
  customerName: string;
  customerNameAr: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  issueDate: string;
  dueDate: string;
  lineItems: LineItemDraft[];
  calculated: CalculatedInvoice;
  qrPayload: string;
  amountInWords: AmountInWords;
}

export type InvoiceForPrintResult =
  | { status: "not-found" }
  | { status: "ok"; invoice: InvoiceForPrint };

// Used only by the internal /print/invoice/[id] page, which headless
// Chromium navigates to and which has no Clerk session of its own —
// `businessId` here is never client-supplied; it comes from a signed
// print-token minted by an already-authenticated caller (see
// src/lib/print-token.ts). Renders from the invoice's own STORED
// snapshot/totals/amountInWords/qrCodeData (immutable at save time),
// matching what was actually true when the invoice was saved — not
// recomputed from the current, possibly-since-changed line items. Business
// name/VAT/CR and bank details are still read live, same as the on-screen
// builder/preview already does (those aren't snapshotted on Invoice at all).
export async function getInvoiceForPrint(invoiceId: string, businessId: string): Promise<InvoiceForPrintResult> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { items: { orderBy: { sortOrder: "asc" } }, business: { include: { bankAccounts: true } } },
  });
  if (!invoice) return { status: "not-found" };

  const { business: businessWithAccounts } = invoice;
  const { bankAccounts, ...business } = businessWithAccounts;
  const bankAccount = bankAccounts.find((account) => account.isDefault) ?? bankAccounts[0] ?? null;

  const { name: customerName, nameAr: customerNameAr } = customerDisplayFromSnapshot(invoice.customerSnapshot);

  const lineItems: LineItemDraft[] = invoice.items.map((item) => ({
    key: item.id,
    description: item.description,
    descriptionAr: item.descriptionAr ?? "",
    quantity: item.quantity.toString(),
    unit: item.unit ?? "",
    rate: item.rate.toString(),
    discount: item.discount.toString(),
    vatRate: item.vatRate.toString(),
  }));

  // Built directly from each item's own stored columns, not recalculated —
  // `amount` is the one exception, since it isn't its own stored column
  // (only vatAmount/lineTotal are); it's cheap and lossless to re-derive
  // (quantity × rate) and InvoiceSheetPreview doesn't render it anyway.
  const calculated: CalculatedInvoice = {
    lines: invoice.items.map((item) => ({
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount,
      vatRate: item.vatRate,
      amount: item.quantity.times(item.rate),
      vatAmount: item.vatAmount,
      lineTotal: item.lineTotal,
    })),
    subtotal: invoice.subtotal,
    discountAmount: invoice.discountAmount,
    vatAmount: invoice.vatAmount,
    totalAmount: invoice.totalAmount,
  };

  // Both fields have been populated at save time since the QR/amount-in-
  // words milestones landed — this fallback only matters for rows saved
  // before that (e.g. seed data), so a pre-existing invoice can still be
  // printed correctly instead of showing blank/stale content.
  const qrPayload =
    invoice.qrCodeData ??
    buildInvoiceQrPayload({
      sellerName: business.name,
      vatRegistrationNumber: business.vatNumber ?? "",
      totalAmount: invoice.totalAmount,
      vatAmount: invoice.vatAmount,
      issueDate: toDateInputValue(invoice.issueDate),
    });
  const amountInWords: AmountInWords =
    invoice.amountInWordsEn && invoice.amountInWordsAr
      ? { en: invoice.amountInWordsEn, ar: invoice.amountInWordsAr }
      : amountToWords(invoice.totalAmount, invoice.currencyCode);

  return {
    status: "ok",
    invoice: {
      business,
      bankAccount,
      customerName,
      customerNameAr,
      invoiceNumber: invoice.invoiceNumber,
      invoiceType: invoice.invoiceType,
      issueDate: toDateInputValue(invoice.issueDate),
      dueDate: toDateInputValue(invoice.dueDate),
      lineItems,
      calculated,
      qrPayload,
      amountInWords,
    },
  };
}
