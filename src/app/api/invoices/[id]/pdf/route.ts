import type { NextRequest } from "next/server";
import { createPrintToken } from "@/lib/print-token";
import { launchBrowser } from "@/lib/launch-browser";
import { getCurrentBusiness } from "@/server/business";
import { getInvoiceForPrint } from "@/server/invoices";

export const runtime = "nodejs";
// Generous headroom for a cold Chromium launch (2-5s observed) plus page
// render + print; well under Vercel's 300s default.
export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Scoped exactly like every other invoice reader: requesting another
  // tenant's id simply finds no row below, regardless of whether that id
  // exists at all for a different business — never distinguishes the two.
  const current = await getCurrentBusiness();
  if (current.status !== "ok") {
    return new Response("Not authorized.", { status: 401 });
  }

  const result = await getInvoiceForPrint(id, current.business.id);
  if (result.status !== "ok") {
    return new Response("Invoice not found.", { status: 404 });
  }

  // Mints a token authorizing headless Chromium's session-less navigation
  // to the print page below — see src/lib/print-token.ts. The business
  // scoping already happened above; this just carries that result forward.
  const token = createPrintToken(id, current.business.id);
  const printUrl = new URL(`/print/invoice/${id}`, request.nextUrl.origin);
  printUrl.searchParams.set("token", token);

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // "load" rather than "networkidle0": this project's dev server keeps a
    // persistent HMR websocket open, which network-idle heuristics wait
    // out for many seconds (a known issue with this exact setup — see
    // devserver testing notes from earlier milestones). "load" plus the
    // explicit waits below for the QR SVG and web fonts is both faster and
    // more deterministic in every environment, dev or deployed.
    await page.goto(printUrl.toString(), { waitUntil: "load" });
    // The QR code renders async (see InvoiceQrCode.tsx) — wait for its
    // <svg> explicitly rather than assuming it's already there, plus web
    // fonts (Inter/Noto Sans Arabic) finishing before printing.
    await page
      .waitForFunction(() => document.querySelector("svg") !== null, { timeout: 5000 })
      .catch(() => {});
    await page.evaluate(() => document.fonts.ready);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", right: "24px", bottom: "24px", left: "24px" },
    });

    return new Response(new Blob([new Uint8Array(pdfBuffer)]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.invoice.invoiceNumber}.pdf"`,
      },
    });
  } finally {
    await browser.close();
  }
}
