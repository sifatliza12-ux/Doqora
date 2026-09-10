"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import type { InvoiceType } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { FormSection } from "@/components/ui/FormSection";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { amountToWords } from "@/lib/amount-in-words";
import { calculateInvoice } from "@/lib/invoice-calculations";
import { buildInvoiceQrPayload } from "@/lib/invoice-qr";
import { saveInvoiceDraft } from "@/server/invoice-actions";
import type { InvoiceBuilderContext, InvoiceDraftForEdit } from "@/server/invoices";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { InvoiceSheetPreview } from "./InvoiceSheetPreview";
import { LineItemsEditor } from "./LineItemsEditor";
import { makeEmptyLineItem, type LineItemDraft } from "./line-item-draft";

type MobileView = "edit" | "preview";
type SaveState = { status: "idle" | "success" | "error"; message?: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InvoiceBuilder({
  context,
  invoice,
}: {
  context: InvoiceBuilderContext;
  invoice?: InvoiceDraftForEdit;
}) {
  const { business, bankAccount, customers } = context;

  const [mobileView, setMobileView] = useState<MobileView>("edit");
  const [customerId, setCustomerId] = useState(invoice?.customerId ?? "");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(invoice?.invoiceType ?? "TAX_INVOICE");
  const [issueDate, setIssueDate] = useState(invoice?.issueDate ?? todayIso());
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? todayIso());
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>(() =>
    invoice && invoice.items.length > 0
      ? invoice.items.map((item) => ({
          key: item.id,
          description: item.description,
          descriptionAr: item.descriptionAr,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
          vatRate: item.vatRate,
        }))
      : [makeEmptyLineItem("line-1")]
  );
  const newLineCounter = useRef(0);

  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const calculated = useMemo(() => calculateInvoice(lineItems), [lineItems]);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerDisplayName =
    selectedCustomer?.companyName ||
    selectedCustomer?.name ||
    invoice?.customerSnapshotName ||
    "Select a customer";
  const customerDisplayNameAr = selectedCustomer?.companyNameAr || selectedCustomer?.nameAr || "";

  const invoiceNumberPreview = invoice
    ? invoice.invoiceNumber
    : `${business.invoicePrefix}${business.nextInvoiceNumber}`;

  // Always regenerated live from current form state — same treatment as
  // subtotal/vatAmount/totalAmount above, so the QR can never show data
  // that's out of sync with unsaved edits. The stored Invoice.qrCodeData
  // (written at save time) exists for future read-only views, not for
  // driving this preview.
  const qrPayload = buildInvoiceQrPayload({
    invoiceNumber: invoiceNumberPreview,
    businessName: business.name,
    totalAmount: calculated.totalAmount,
    vatAmount: calculated.vatAmount,
    issueDate,
  });

  // Same live-compute treatment as the QR payload above — regenerated from
  // the current total on every render, never read from the stored
  // Invoice.amountInWordsEn/Ar fields.
  const amountInWords = useMemo(
    () => amountToWords(calculated.totalAmount, business.currencyCode),
    [calculated.totalAmount, business.currencyCode]
  );

  function updateLineItem(key: string, field: keyof LineItemDraft, value: string) {
    setLineItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    newLineCounter.current += 1;
    setLineItems((prev) => [...prev, makeEmptyLineItem(`new-${newLineCounter.current}`)]);
  }

  function removeLineItem(key: string) {
    setLineItems((prev) => prev.filter((item) => item.key !== key));
  }

  function handleSave() {
    setSaveState({ status: "idle" });
    startTransition(async () => {
      const result = await saveInvoiceDraft({
        invoiceId: invoice?.id,
        customerId,
        invoiceType,
        issueDate,
        dueDate,
        notes,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          descriptionAr: item.descriptionAr,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
          vatRate: item.vatRate,
        })),
      });
      if (result.status === "success") {
        setSaveState({ status: "success", message: `Saved as ${result.invoiceNumber}.` });
      } else {
        setSaveState({ status: "error", message: result.message });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-foreground">
        {invoice ? `Edit invoice ${invoice.invoiceNumber}` : "New invoice"}
      </h1>

      {/* Mobile-only Edit/Preview pill toggle */}
      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-surface p-1 md:hidden">
        <button
          type="button"
          onClick={() => setMobileView("edit")}
          aria-pressed={mobileView === "edit"}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            mobileView === "edit"
              ? "bg-emerald text-emerald-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setMobileView("preview")}
          aria-pressed={mobileView === "preview"}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            mobileView === "preview"
              ? "bg-emerald text-emerald-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Preview
        </button>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className={cn("md:w-5/12", mobileView === "edit" ? "block" : "hidden", "md:block")}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving…" : "Save Draft"}
              </Button>
              {invoice && (
                <DownloadPdfButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} />
              )}
              {saveState.status === "success" && (
                <p className="text-sm text-success">{saveState.message}</p>
              )}
              {saveState.status === "error" && (
                <p className="text-sm text-danger">{saveState.message}</p>
              )}
            </div>

            <FormSection
              title="Company Information"
              description="Read-only here — edit in Business Profile settings."
            >
              <div className="flex flex-col gap-1 rounded-input border border-border bg-surface p-3">
                <p className="text-sm font-medium text-foreground">{business.name}</p>
                {business.nameAr && (
                  <p dir="rtl" className="text-left text-sm text-muted-foreground">
                    {business.nameAr}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {[
                    business.vatNumber && `VAT ${business.vatNumber}`,
                    business.crNumber && `CR ${business.crNumber}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {business.address && (
                  <p className="text-sm text-muted-foreground">{business.address}</p>
                )}
              </div>
            </FormSection>

            <FormSection title="Customer Information">
              {customers.length === 0 ? (
                <div className="flex flex-col gap-2 rounded-input border border-border bg-surface p-3">
                  <p className="text-sm text-muted-foreground">
                    {invoice?.customerSnapshotName ? (
                      <>
                        This draft was previously linked to &ldquo;{invoice.customerSnapshotName}
                        &rdquo;, who has since been deleted, and you have no other customers.
                      </>
                    ) : (
                      "You don't have any customers yet."
                    )}
                  </p>
                  <Link
                    href="/customers"
                    className="text-sm font-medium text-emerald hover:underline"
                  >
                    Create a customer first →
                  </Link>
                </div>
              ) : (
                <>
                  <Select
                    label="Customer"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    required
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.companyName || customer.name}
                      </option>
                    ))}
                  </Select>
                  {!customerId && invoice?.customerSnapshotName && (
                    <p className="text-sm text-muted-foreground">
                      Previously linked to &ldquo;{invoice.customerSnapshotName}&rdquo;, who has
                      since been deleted. Pick a customer to relink this draft.
                    </p>
                  )}
                </>
              )}
            </FormSection>

            <FormSection title="Invoice Information">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Invoice #" value={invoiceNumberPreview} disabled />
                <Select
                  label="Type"
                  value={invoiceType}
                  onChange={(event) => setInvoiceType(event.target.value as InvoiceType)}
                >
                  <option value="TAX_INVOICE">Tax Invoice</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PROFORMA">Proforma</option>
                </Select>
                <Input
                  label="Issue date"
                  type="date"
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                  required
                />
                <Input
                  label="Due date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </div>
            </FormSection>

            <FormSection title="Line Items">
              <LineItemsEditor
                lineItems={lineItems}
                calculatedLines={calculated.lines}
                onChange={updateLineItem}
                onAdd={addLineItem}
                onRemove={removeLineItem}
              />
            </FormSection>

            <FormSection title="Payment Information">
              {bankAccount ? (
                <div className="flex flex-col gap-1 rounded-input border border-border bg-surface p-3">
                  <p className="text-sm font-medium text-foreground">IBAN {bankAccount.iban}</p>
                  {bankAccount.swiftCode && (
                    <p className="text-sm text-muted-foreground">Swift {bankAccount.swiftCode}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No bank account on file. Add one in Settings.
                </p>
              )}
            </FormSection>

            <FormSection title="Notes">
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any notes for this invoice…"
              />
            </FormSection>
          </div>
        </div>
        <div className={cn("md:w-7/12", mobileView === "preview" ? "block" : "hidden", "md:block")}>
          <InvoiceSheetPreview
            business={business}
            bankAccount={bankAccount}
            customerName={customerDisplayName}
            customerNameAr={customerDisplayNameAr}
            invoiceNumber={invoiceNumberPreview}
            invoiceType={invoiceType}
            issueDate={issueDate}
            dueDate={dueDate}
            lineItems={lineItems}
            calculated={calculated}
            qrPayload={qrPayload}
            amountInWords={amountInWords}
          />
        </div>
      </div>
    </div>
  );
}
