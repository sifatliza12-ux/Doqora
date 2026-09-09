// Provisional QR payload encoding — plain pipe-delimited text, NOT the real
// ZATCA TLV/base64 format required for Saudi/GCC e-invoicing compliance.
// That format needs its own research spike and is a distinct, later
// milestone; this exists so the QR code on the invoice sheet is backed by
// real invoice data now instead of a decorative placeholder. Expect this
// payload shape to be replaced entirely once ZATCA compliance work starts.
export interface QrPayloadInput {
  invoiceNumber: string;
  businessName: string;
  totalAmount: { toFixed(decimalPlaces: number): string };
  vatAmount: { toFixed(decimalPlaces: number): string };
  issueDate: string;
}

export function buildInvoiceQrPayload(input: QrPayloadInput): string {
  return [
    "INV",
    input.invoiceNumber,
    input.businessName,
    input.totalAmount.toFixed(2),
    input.vatAmount.toFixed(2),
    input.issueDate,
  ].join("|");
}
