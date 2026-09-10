import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Short-lived, signed tokens that authorize the internal /print/invoice/[id]
// route — a page headless Chromium navigates to, which has no Clerk session
// of its own. The route handler that triggers PDF generation mints a token
// only after it has already verified (via the normal Clerk-session-derived
// getCurrentBusiness()) that the requesting user may see this invoice; the
// print page then trusts the token instead of re-deriving auth from a
// session that doesn't exist in that context. Business scoping therefore
// happens once, at mint time, by a caller that already proved it — the
// token just carries that proof forward, HMAC-signed so it can't be forged
// or altered (e.g. swapped to a different invoiceId/businessId) and
// expires quickly since it only needs to survive one immediate print.

interface PrintTokenPayload {
  invoiceId: string;
  businessId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.PRINT_TOKEN_SECRET;
  if (!secret) {
    throw new Error("PRINT_TOKEN_SECRET is not set.");
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createPrintToken(invoiceId: string, businessId: string, ttlMs = 60_000): string {
  const payload: PrintTokenPayload = { invoiceId, businessId, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyPrintToken(token: string): PrintTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<PrintTokenPayload>;
    if (
      typeof payload.invoiceId !== "string" ||
      typeof payload.businessId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload as PrintTokenPayload;
  } catch {
    return null;
  }
}
