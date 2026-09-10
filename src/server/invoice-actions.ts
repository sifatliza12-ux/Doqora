"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Business, InvoiceType } from "@prisma/client";
import { amountToWords } from "@/lib/amount-in-words";
import { calculateInvoice, type LineItemCalcInput } from "@/lib/invoice-calculations";
import { buildInvoiceQrPayload } from "@/lib/invoice-qr";
import { prisma } from "@/lib/prisma";
import { requireCurrentBusinessId } from "@/server/business";

const INVOICE_TYPES: InvoiceType[] = ["TAX_INVOICE", "STANDARD", "PROFORMA"];
function isInvoiceType(value: string): value is InvoiceType {
  return (INVOICE_TYPES as string[]).includes(value);
}

export interface SaveInvoiceLineItemInput {
  description: string;
  descriptionAr: string;
  quantity: string;
  unit: string;
  rate: string;
  discount: string;
  vatRate: string;
}

export interface SaveInvoiceDraftInput {
  invoiceId?: string;
  customerId: string;
  invoiceType: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lineItems: SaveInvoiceLineItemInput[];
}

export type SaveInvoiceDraftResult =
  | { status: "success"; invoiceId: string; invoiceNumber: string }
  | { status: "error"; message: string };

function buildBusinessSnapshot(business: Business) {
  return {
    name: business.name,
    nameAr: business.nameAr,
    address: business.address,
    addressAr: business.addressAr,
    city: business.city,
    country: business.country,
    crNumber: business.crNumber,
    vatNumber: business.vatNumber,
    phone: business.phone,
    email: business.email,
  };
}

function hasLineItemContent(line: SaveInvoiceLineItemInput): boolean {
  return (
    line.description.trim().length > 0 ||
    Number(line.quantity) > 0 ||
    Number(line.rate) > 0
  );
}

export async function saveInvoiceDraft(input: SaveInvoiceDraftInput): Promise<SaveInvoiceDraftResult> {
  const businessId = await requireCurrentBusinessId();

  if (!input.customerId) {
    return { status: "error", message: "Select a customer." };
  }
  if (!isInvoiceType(input.invoiceType)) {
    return { status: "error", message: "Invalid invoice type." };
  }
  // Narrowed to a local const: property narrowing on `input.invoiceType`
  // doesn't survive into the $transaction closure below.
  const invoiceType = input.invoiceType;
  if (!input.issueDate || !input.dueDate) {
    return { status: "error", message: "Issue date and due date are required." };
  }

  const nonEmptyLines = input.lineItems.filter(hasLineItemContent);
  if (nonEmptyLines.length === 0) {
    return { status: "error", message: "Add at least one line item." };
  }
  if (nonEmptyLines.some((line) => line.description.trim().length === 0)) {
    return { status: "error", message: "Every line item needs a description." };
  }

  // Re-derived from the DB, never trusted from the client — the snapshot
  // must reflect the ACTUAL current customer, not whatever the browser sent.
  const customer = await prisma.customer.findFirst({ where: { id: input.customerId, businessId } });
  if (!customer) {
    return { status: "error", message: "Customer not found." };
  }

  const calculated = calculateInvoice(nonEmptyLines as LineItemCalcInput[]);

  const customerSnapshot = {
    name: customer.name,
    nameAr: customer.nameAr,
    companyName: customer.companyName,
    companyNameAr: customer.companyNameAr,
    vatNumber: customer.vatNumber,
    address: customer.address,
    addressAr: customer.addressAr,
    city: customer.city,
    country: customer.country,
  };

  const itemsData = calculated.lines.map((line, index) => ({
    description: nonEmptyLines[index].description.trim(),
    descriptionAr: nonEmptyLines[index].descriptionAr.trim() || null,
    quantity: line.quantity,
    unit: nonEmptyLines[index].unit.trim() || null,
    rate: line.rate,
    discount: line.discount,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    sortOrder: index,
  }));

  if (input.invoiceId) {
    const existing = await prisma.invoice.findFirst({ where: { id: input.invoiceId, businessId } });
    if (!existing) {
      return { status: "error", message: "Invoice not found." };
    }
    if (existing.status !== "DRAFT") {
      return { status: "error", message: "Only draft invoices can be edited." };
    }

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const businessSnapshot = buildBusinessSnapshot(business);
    const qrCodeData = buildInvoiceQrPayload({
      sellerName: business.name,
      vatRegistrationNumber: business.vatNumber ?? "",
      totalAmount: calculated.totalAmount,
      vatAmount: calculated.vatAmount,
      issueDate: input.issueDate,
    });
    const amountWords = amountToWords(calculated.totalAmount, existing.currencyCode);

    // Line items are fully replaced on every save rather than diffed —
    // simplest correct behavior for a list that can be freely
    // added/removed/reordered in the builder.
    await prisma.$transaction([
      prisma.invoiceItem.deleteMany({ where: { invoiceId: existing.id } }),
      prisma.invoice.update({
        where: { id: existing.id },
        data: {
          customerId: customer.id,
          invoiceType,
          issueDate: new Date(input.issueDate),
          dueDate: new Date(input.dueDate),
          notes: input.notes.trim() || null,
          customerSnapshot,
          businessSnapshot,
          subtotal: calculated.subtotal,
          discountAmount: calculated.discountAmount,
          vatAmount: calculated.vatAmount,
          totalAmount: calculated.totalAmount,
          qrCodeData,
          amountInWordsEn: amountWords.en,
          amountInWordsAr: amountWords.ar,
          items: { create: itemsData },
        },
      }),
    ]);

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${existing.id}`);
    return { status: "success", invoiceId: existing.id, invoiceNumber: existing.invoiceNumber };
  }

  // CREATE: the invoice number is assigned and Business.nextInvoiceNumber
  // incremented atomically here — never earlier (e.g. on page load), so an
  // abandoned "New Invoice" form never burns a number. The UPDATE itself
  // (not a prior SELECT) is what makes this atomic: Postgres row-locks
  // Business for the transaction's duration, so concurrent creates can't
  // both read the same nextInvoiceNumber.
  const created = await prisma.$transaction(async (tx) => {
    const updatedBusiness = await tx.business.update({
      where: { id: businessId },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const assignedNumber = updatedBusiness.nextInvoiceNumber - 1;
    const invoiceNumber = `${updatedBusiness.invoicePrefix}${assignedNumber}`;
    const businessSnapshot = buildBusinessSnapshot(updatedBusiness);
    const qrCodeData = buildInvoiceQrPayload({
      sellerName: updatedBusiness.name,
      vatRegistrationNumber: updatedBusiness.vatNumber ?? "",
      totalAmount: calculated.totalAmount,
      vatAmount: calculated.vatAmount,
      issueDate: input.issueDate,
    });
    const amountWords = amountToWords(calculated.totalAmount, updatedBusiness.currencyCode);

    return tx.invoice.create({
      data: {
        businessId,
        customerId: customer.id,
        invoiceNumber,
        invoiceType,
        status: "DRAFT",
        issueDate: new Date(input.issueDate),
        dueDate: new Date(input.dueDate),
        currencyCode: updatedBusiness.currencyCode,
        languageMode: updatedBusiness.defaultLanguageMode,
        notes: input.notes.trim() || null,
        customerSnapshot,
        businessSnapshot,
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        vatAmount: calculated.vatAmount,
        totalAmount: calculated.totalAmount,
        qrCodeData,
        amountInWordsEn: amountWords.en,
        amountInWordsAr: amountWords.ar,
        items: { create: itemsData },
      },
    });
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${created.id}`);
}

export type InvoiceStatusActionResult = { status: "success" } | { status: "error"; message: string };

function revalidateInvoice(invoiceId: string) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

// Each transition's `where.status` doubles as the guard against illegal
// moves (e.g. DRAFT -> PAID, or a double-click racing two transitions at
// once) — matched atomically in the same query as the ownership check, so
// an invalid transition and a wrong-tenant id fail exactly the same way.
export async function markInvoiceSent(invoiceId: string): Promise<InvoiceStatusActionResult> {
  const businessId = await requireCurrentBusinessId();
  const result = await prisma.invoice.updateMany({
    where: { id: invoiceId, businessId, status: "DRAFT" },
    data: { status: "SENT", statusUpdatedAt: new Date() },
  });
  if (result.count === 0) {
    return { status: "error", message: "Invoice not found or cannot be marked as sent." };
  }
  revalidateInvoice(invoiceId);
  return { status: "success" };
}

export async function markInvoicePaid(invoiceId: string): Promise<InvoiceStatusActionResult> {
  const businessId = await requireCurrentBusinessId();
  const result = await prisma.invoice.updateMany({
    where: { id: invoiceId, businessId, status: "SENT" },
    data: { status: "PAID", statusUpdatedAt: new Date() },
  });
  if (result.count === 0) {
    return { status: "error", message: "Invoice not found or cannot be marked as paid." };
  }
  revalidateInvoice(invoiceId);
  return { status: "success" };
}

export async function cancelInvoice(invoiceId: string): Promise<InvoiceStatusActionResult> {
  const businessId = await requireCurrentBusinessId();
  const result = await prisma.invoice.updateMany({
    where: { id: invoiceId, businessId, status: "SENT" },
    data: { status: "CANCELLED", statusUpdatedAt: new Date() },
  });
  if (result.count === 0) {
    return { status: "error", message: "Invoice not found or cannot be cancelled." };
  }
  revalidateInvoice(invoiceId);
  return { status: "success" };
}

export type DeleteInvoiceResult = { status: "success" } | { status: "error"; message: string };

// Draft-only, checked before touching anything: a sent/paid/cancelled
// invoice is a finalized financial record, not something a UI action
// should be able to erase. InvoiceItem has no onDelete: Cascade (see
// schema.prisma), so its rows are removed explicitly in the same
// transaction as the invoice itself.
export async function deleteInvoice(invoiceId: string): Promise<DeleteInvoiceResult> {
  const businessId = await requireCurrentBusinessId();

  const existing = await prisma.invoice.findFirst({ where: { id: invoiceId, businessId } });
  if (!existing) {
    return { status: "error", message: "Invoice not found." };
  }
  if (existing.status !== "DRAFT") {
    return { status: "error", message: "Only draft invoices can be deleted." };
  }

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
    prisma.invoice.delete({ where: { id: invoiceId } }),
  ]);

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { status: "success" };
}

export type DuplicateInvoiceResult =
  | { status: "success"; invoiceId: string; invoiceNumber: string }
  | { status: "error"; message: string };

// Available from any status (Draft, Sent, Paid, Cancelled all included —
// e.g. duplicating a Cancelled invoice to redo it, or a Paid one to bill
// the same customer again). Always produces a brand-new, independent
// DRAFT: its own atomically-assigned invoice number, a fresh snapshot
// taken now (never the source's frozen one), today's issue/due dates.
// Only the customer link and line items carry over from the source.
export async function duplicateInvoice(invoiceId: string): Promise<DuplicateInvoiceResult> {
  const businessId = await requireCurrentBusinessId();

  const source = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) {
    return { status: "error", message: "Invoice not found." };
  }

  const lineInputs: LineItemCalcInput[] = source.items.map((item) => ({
    quantity: item.quantity,
    rate: item.rate,
    discount: item.discount,
    vatRate: item.vatRate,
  }));
  const calculated = calculateInvoice(lineInputs);
  const itemsData = calculated.lines.map((line, index) => ({
    description: source.items[index].description,
    descriptionAr: source.items[index].descriptionAr,
    quantity: line.quantity,
    unit: source.items[index].unit,
    rate: line.rate,
    discount: line.discount,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    sortOrder: index,
  }));

  const today = new Date().toISOString().slice(0, 10);

  const created = await prisma.$transaction(async (tx) => {
    const updatedBusiness = await tx.business.update({
      where: { id: businessId },
      data: { nextInvoiceNumber: { increment: 1 } },
    });
    const assignedNumber = updatedBusiness.nextInvoiceNumber - 1;
    const invoiceNumber = `${updatedBusiness.invoicePrefix}${assignedNumber}`;
    const businessSnapshot = buildBusinessSnapshot(updatedBusiness);
    const qrCodeData = buildInvoiceQrPayload({
      sellerName: updatedBusiness.name,
      vatRegistrationNumber: updatedBusiness.vatNumber ?? "",
      totalAmount: calculated.totalAmount,
      vatAmount: calculated.vatAmount,
      issueDate: today,
    });
    const amountWords = amountToWords(calculated.totalAmount, updatedBusiness.currencyCode);

    // If the source's customer still exists, snapshot it fresh (same as a
    // normal create). If it's since been deleted, fall back to the
    // source's own frozen snapshot rather than leaving the duplicate with
    // no data at all — same orphaned-draft pattern the builder already
    // handles for relinking a deleted customer.
    let customerId = source.customerId;
    let customerSnapshot = source.customerSnapshot;
    if (customerId) {
      const customer = await tx.customer.findFirst({ where: { id: customerId, businessId } });
      if (customer) {
        customerSnapshot = {
          name: customer.name,
          nameAr: customer.nameAr,
          companyName: customer.companyName,
          companyNameAr: customer.companyNameAr,
          vatNumber: customer.vatNumber,
          address: customer.address,
          addressAr: customer.addressAr,
          city: customer.city,
          country: customer.country,
        };
      } else {
        customerId = null;
      }
    }

    return tx.invoice.create({
      data: {
        businessId,
        customerId,
        invoiceNumber,
        invoiceType: source.invoiceType,
        status: "DRAFT",
        issueDate: new Date(today),
        dueDate: new Date(today),
        currencyCode: updatedBusiness.currencyCode,
        languageMode: updatedBusiness.defaultLanguageMode,
        notes: source.notes,
        customerSnapshot: customerSnapshot ?? {},
        businessSnapshot,
        subtotal: calculated.subtotal,
        discountAmount: calculated.discountAmount,
        vatAmount: calculated.vatAmount,
        totalAmount: calculated.totalAmount,
        qrCodeData,
        amountInWordsEn: amountWords.en,
        amountInWordsAr: amountWords.ar,
        items: { create: itemsData },
      },
    });
  });

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { status: "success", invoiceId: created.id, invoiceNumber: created.invoiceNumber };
}
