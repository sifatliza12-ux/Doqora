import type { NextRequest } from "next/server";
import { createPrintToken } from "@/lib/print-token";
import { launchBrowser } from "@/lib/launch-browser";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentBusiness } from "@/server/business";
import { getInvoiceForPrint } from "@/server/invoices";

export const runtime = "nodejs";
// Generous headroom for a cold Chromium launch (2-5s observed) plus page
// render + print; well under Vercel's 300s default.
export const maxDuration = 60;

// Each request launches a full headless Chromium instance — meaningfully
// expensive compared to a normal request. Keyed by businessId (derived from
// the session below, never client-supplied) rather than IP, since IP is
// unreliable behind Vercel's proxy and businessId is the identity that
// actually matters here. See src/lib/rate-limit.ts for the distributed
// (Redis-backed) implementation and its fail-open reasoning.
const PDF_RATE_LIMIT = 10;
const PDF_RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Scoped exactly like every other invoice reader: requesting another
  // tenant's id simply finds no row below, regardless of whether that id
  // exists at all for a different business — never distinguishes the two.
  const current = await getCurrentBusiness();
  if (current.status !== "ok") {
    return new Response("Not authorized.", { status: 401 });
  }

  const rateLimit = await checkRateLimit(`pdf:${current.business.id}`, PDF_RATE_LIMIT, PDF_RATE_LIMIT_WINDOW_MS);
  if (!rateLimit.allowed) {
    return new Response("Too many PDF requests. Please wait a moment and try again.", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
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
    // <svg> explicitly rather than assuming it's already there.
    await page
      .waitForFunction(() => document.querySelector("svg") !== null, { timeout: 5000 })
      .catch(() => {});
    // `document.fonts.ready` alone isn't a reliable signal that a given
    // @font-face has actually finished loading: it resolves once whatever
    // has been *requested so far* has settled, including vacuously (zero
    // pending loads) if layout hadn't triggered the request yet, and it
    // resolves on load *failure* too, not just success. That gap is what
    // previously let a production PDF ship with neither Inter nor Noto
    // Sans Arabic actually embedded (only sparticuz/chromium's own bundled
    // fallback font). document.fonts.load() forces the request for each
    // family with real sample text (Arabic included, since subsetted web
    // fonts can be requested per unicode-range) and rejects on genuine
    // failure instead of swallowing it.
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('16px "Inter"', "Invoice 0123456789"),
        document.fonts.load('16px "Noto Sans Arabic"', "فاتورة ضريبية"),
      ]);
      await document.fonts.ready;
    });

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
