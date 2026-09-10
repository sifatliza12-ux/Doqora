import { notFound } from "next/navigation";
import { InvoiceSheetPreview } from "@/app/(app)/invoices/InvoiceSheetPreview";
import { verifyPrintToken } from "@/lib/print-token";
import { getInvoiceForPrint } from "@/server/invoices";

// Not part of the (app) route group on purpose: this page has no Clerk
// session (headless Chromium navigates here directly, cookie-less) and no
// app chrome (sidebar/nav) — it's the print-only surface the PDF route
// (src/app/api/invoices/[id]/pdf/route.ts) points a headless browser at.
// Authorization is a short-lived signed token, not a session — see
// src/lib/print-token.ts for why that's the right trust boundary here.
export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const payload = token ? verifyPrintToken(token) : null;
  if (!payload || payload.invoiceId !== id) {
    notFound();
  }

  const result = await getInvoiceForPrint(id, payload.businessId);
  if (result.status !== "ok") {
    notFound();
  }

  const { invoice } = result;

  return (
    <div
      className="min-h-screen bg-sheet-background [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
      // The on-screen sheet has a drop shadow for its "paper on a dark
      // desk" effect (see InvoiceSheet.tsx) — appropriate on screen, not
      // on an actual printed/PDF page, which IS the paper. Overriding the
      // CSS variable the shadow-sheet utility reads turns it off for this
      // page only, without touching the locked InvoiceSheet component. No
      // extra padding here either — page.pdf()'s own margin option (see
      // the API route) already spaces the content from the page edge;
      // adding more here would just double it up.
      style={{ "--shadow-sheet": "none" } as React.CSSProperties}
    >
      {/* The root layout's <body> defaults to the app's dark workspace
          background (globals.css). A4 pages taller than this page's own
          content would otherwise show that dark background bleeding
          through below the sheet instead of staying paper-white. */}
      <style>{"body { background: #ffffff; }"}</style>
      <InvoiceSheetPreview
        business={invoice.business}
        bankAccount={invoice.bankAccount}
        customerName={invoice.customerName}
        customerNameAr={invoice.customerNameAr}
        invoiceNumber={invoice.invoiceNumber}
        invoiceType={invoice.invoiceType}
        issueDate={invoice.issueDate}
        dueDate={invoice.dueDate}
        lineItems={invoice.lineItems}
        calculated={invoice.calculated}
        qrPayload={invoice.qrPayload}
        amountInWords={invoice.amountInWords}
      />
    </div>
  );
}
