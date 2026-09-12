"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Business, InvoiceType } from "@prisma/client";
import { amountToWords } from "@/lib/amount-in-words";
import { calculateInvoice, type LineItemCalcInput } from "@/lib/invoice-calculations";
import { buildInvoiceQrPayload } from "@/lib/invoice-qr";
import { prisma } from "@/lib/prisma";
import { requireCurrentBusinessId } from "@/server/business";

const INVOICE_TYPES: InvoiceType[] = ["TAX_INVOICE", "STANDARD", "PROFORMA", "QUOTATION"];
function isInvoiceType(value: string): value is InvoiceType {
  return (INVOICE_TYPES as string[]).includes(value);
}

// QUOTATION draws from its own number sequence (quotePrefix/nextQuoteNumber)
// and must never cross into the real invoice sequence, or vice versa — this
// is the one predicate every numbering/conversion decision below is built on.
function isQuotationType(type: InvoiceType): boolean {
  return type === "QUOTATION";
}

// Real current UTC time (HH:mm) — for duplicateInvoice/convertQuoteToInvoice
// below, which auto-create a fresh document with no user-facing issue-time
// input of their own (unlike saveInvoiceDraft's manual builder flow). Using
// the server clock's actual time here is the same "real timestamp instead
// of a fixed fallback" fix, just derived from `new Date()` rather than a
// form field. Takes the already-computed `now` so a single Date instance
// backs both the date and time parts, rather than two separate clock reads.
function nowTimeUtc(now: Date): string {
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
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
  issueTime: string;
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
  if (!input.issueDate || !input.issueTime || !input.dueDate) {
    return { status: "error", message: "Issue date, issue time, and due date are required." };
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
    // A document's number was assigned from whichever sequence matched its
    // type AT CREATION TIME — letting an edit silently cross the
    // quote/invoice boundary here would leave a QUO- numbered row typed as
    // a real invoice (or vice versa). Converting a quote to a real invoice
    // is a separate, deliberate action (convertQuoteToInvoice) that mints a
    // brand-new row with a fresh number, not a type flip on this one.
    if (isQuotationType(existing.invoiceType) !== isQuotationType(invoiceType)) {
      return {
        status: "error",
        message: "A quotation can't be changed into an invoice type here — use Convert to Invoice instead.",
      };
    }

    const business = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    const businessSnapshot = buildBusinessSnapshot(business);
    const qrCodeData = buildInvoiceQrPayload({
      sellerName: business.name,
      vatRegistrationNumber: business.vatNumber ?? "",
      totalAmount: calculated.totalAmount,
      vatAmount: calculated.vatAmount,
      issueDate: input.issueDate,
      issueTime: input.issueTime,
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
          issueDate: new Date(`${input.issueDate}T${input.issueTime}:00Z`),
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
  // both read the same nextInvoiceNumber. A QUOTATION draws from the
  // entirely separate quotePrefix/nextQuoteNumber sequence instead, via the
  // exact same atomic-increment pattern — it never touches, reserves, or
  // consumes a real invoice number.
  const created = await prisma.$transaction(async (tx) => {
    const isQuotation = isQuotationType(invoiceType);
    const updatedBusiness = isQuotation
      ? await tx.business.update({ where: { id: businessId }, data: { nextQuoteNumber: { increment: 1 } } })
      : await tx.business.update({ where: { id: businessId }, data: { nextInvoiceNumber: { increment: 1 } } });
    const invoiceNumber = isQuotation
      ? `${updatedBusiness.quotePrefix}${updatedBusiness.nextQuoteNumber - 1}`
      : `${updatedBusiness.invoicePrefix}${updatedBusiness.nextInvoiceNumber - 1}`;
    const businessSnapshot = buildBusinessSnapshot(updatedBusiness);
    const qrCodeData = buildInvoiceQrPayload({
      sellerName: updatedBusiness.name,
      vatRegistrationNumber: updatedBusiness.vatNumber ?? "",
      totalAmount: calculated.totalAmount,
      vatAmount: calculated.vatAmount,
      issueDate: input.issueDate,
      issueTime: input.issueTime,
    });
    const amountWords = amountToWords(calculated.totalAmount, updatedBusiness.currencyCode);

    return tx.invoice.create({
      data: {
        businessId,
        customerId: customer.id,
        invoiceNumber,
        invoiceType,
        status: "DRAFT",
        issueDate: new Date(`${input.issueDate}T${input.issueTime}:00Z`),
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
  // A quotation that's already been converted has a real invoice pointing
  // back to it as its audit trail (Invoice.convertedFromQuote) — deleting
  // the quote row here would erase that trail even though the resulting
  // invoice itself is unaffected either way. Simpler to just not allow it.
  if (existing.convertedToInvoiceId) {
    return { status: "error", message: "This quotation has already been converted to an invoice and can't be deleted." };
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
// Duplicating a quotation produces another quotation (own QUO- sequence,
// same as the source) rather than silently promoting it into a real
// invoice — invoiceType carries over unchanged, so the numbering sequence
// below has to follow it too, exactly like saveInvoiceDraft's CREATE
// branch. The convertedToInvoiceId link never carries over: a duplicate is
// its own fresh, not-yet-converted document regardless of the source's
// conversion state.
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

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const issueTime = nowTimeUtc(now);

  const created = await prisma.$transaction(async (tx) => {
    const isQuotation = isQuotationType(source.invoiceType);
    const updatedBusiness = isQuotation
      ? await tx.business.update({ where: { id: businessId }, data: { nextQuoteNumber: { increment: 1 } } })
      : await tx.business.update({ where: { id: businessId }, data: { nextInvoiceNumber: { increment: 1 } } });
    const invoiceNumber = isQuotation
      ? `${updatedBusiness.quotePrefix}${updatedBusiness.nextQuoteNumber - 1}`
      : `${updatedBusiness.invoicePrefix}${updatedBusiness.nextInvoiceNumber - 1}`;
    const businessSnapshot = buildBusinessSnapshot(updatedBusiness);
    const qrCodeData = buildInvoiceQrPayload({
      sellerName: updatedBusiness.name,
      vatRegistrationNumber: updatedBusiness.vatNumber ?? "",
      totalAmount: calculated.totalAmount,
      vatAmount: calculated.vatAmount,
      issueDate: today,
      issueTime,
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
        issueDate: new Date(`${today}T${issueTime}:00Z`),
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

export type ConvertQuoteResult =
  | { status: "success"; invoiceId: string; invoiceNumber: string }
  | { status: "error"; message: string };

const ALREADY_CONVERTED_SENTINEL = "QUOTE_ALREADY_CONVERTED";

// Available from DRAFT or SENT — not CANCELLED, since converting a quote
// the business explicitly voided doesn't make sense. DRAFT is deliberately
// allowed alongside SENT: nothing about "hasn't been formally sent through
// this system yet" makes a quote's customer/line-item data any less real
// (e.g. the deal was agreed over the phone before the quote was ever
// emailed), and restricting to SENT-only would be an arbitrary blocker with
// no correctness reason behind it.
//
// Always produces a brand-new TAX_INVOICE — never a mutation of the quote
// itself — using the REAL invoice number sequence via the exact same
// atomic-assignment pattern as every other creation path here. The quote
// row is left untouched apart from the new convertedToInvoiceId link: its
// own status/content stay exactly as they were, so it remains a faithful
// record of what was actually quoted.
export async function convertQuoteToInvoice(quoteId: string): Promise<ConvertQuoteResult> {
  const businessId = await requireCurrentBusinessId();

  const source = await prisma.invoice.findFirst({
    where: { id: quoteId, businessId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) {
    return { status: "error", message: "Quotation not found." };
  }
  if (source.invoiceType !== "QUOTATION") {
    return { status: "error", message: "Only quotations can be converted to an invoice." };
  }
  if (source.status === "CANCELLED") {
    return { status: "error", message: "Cancelled quotations can't be converted." };
  }
  if (source.convertedToInvoiceId) {
    return { status: "error", message: "This quotation has already been converted to an invoice." };
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

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const issueTime = nowTimeUtc(now);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const updatedBusiness = await tx.business.update({
        where: { id: businessId },
        data: { nextInvoiceNumber: { increment: 1 } },
      });
      const invoiceNumber = `${updatedBusiness.invoicePrefix}${updatedBusiness.nextInvoiceNumber - 1}`;
      const businessSnapshot = buildBusinessSnapshot(updatedBusiness);
      const qrCodeData = buildInvoiceQrPayload({
        sellerName: updatedBusiness.name,
        vatRegistrationNumber: updatedBusiness.vatNumber ?? "",
        totalAmount: calculated.totalAmount,
        vatAmount: calculated.vatAmount,
        issueDate: today,
        issueTime,
      });
      const amountWords = amountToWords(calculated.totalAmount, updatedBusiness.currencyCode);

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

      const newInvoice = await tx.invoice.create({
        data: {
          businessId,
          customerId,
          invoiceNumber,
          invoiceType: "TAX_INVOICE",
          status: "DRAFT",
          issueDate: new Date(`${today}T${issueTime}:00Z`),
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

      // Atomically claim the quote for this new invoice. If another
      // concurrent conversion already claimed it between our initial read
      // above and now, this updates zero rows — throwing here rolls back
      // the whole transaction (the invoice just created and the number
      // just burned included), rather than leaving two invoices each
      // half-claiming the same quote.
      const claim = await tx.invoice.updateMany({
        where: { id: source.id, businessId, convertedToInvoiceId: null, status: { not: "CANCELLED" } },
        data: { convertedToInvoiceId: newInvoice.id },
      });
      if (claim.count === 0) {
        throw new Error(ALREADY_CONVERTED_SENTINEL);
      }

      return newInvoice;
    });

    revalidatePath("/invoices");
    revalidatePath("/dashboard");
    revalidatePath(`/invoices/${quoteId}`);
    return { status: "success", invoiceId: created.id, invoiceNumber: created.invoiceNumber };
  } catch (error) {
    if (error instanceof Error && error.message === ALREADY_CONVERTED_SENTINEL) {
      return { status: "error", message: "This quotation has already been converted to an invoice." };
    }
    throw error;
  }
}
