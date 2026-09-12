// ZATCA Phase 1 ("Generation Phase") compliant QR code payload — TLV
// (Tag-Length-Value) encoded, then Base64'd. Source (ZATCA's own official
// guide, fetched directly from zatca.gov.sa, not a third-party summary):
// "Guide to Developed FATOORA Compliant QR Code", zatca.gov.sa/ar/E-Invoicing/
// SystemsDevelopers/Documents/QRCodeCreation.pdf (18 Nov 2021).
//
// Field Definition for the QR Code (Phase 1 fields, due 4th Dec 2021):
//   Tag 1 — Seller's name
//   Tag 2 — VAT registration number of the seller
//   Tag 3 — Time stamp of the invoice (date and time)
//   Tag 4 — Invoice total (with VAT)
//   Tag 5 — VAT total
// Tags 6-9 (XML hash, ECDSA signature/public key, ZATCA CA signature) are
// Phase 2 ("Integration Phase") fields — out of scope here by design; Phase
// 2 requires XML generation, cryptographic stamping and live ZATCA API
// onboarding, a separate future initiative.
//
// TLV encoding, per the same source: each field is Tag (1 byte) + Length
// (1 byte, the UTF-8 byte length of the value, not its character count) +
// Value (UTF-8 bytes) — concatenated with no padding/separators between
// fields, then the whole byte sequence is Base64-encoded.
//
// Verified against ZATCA's own worked example from that guide (seller
// "Bobs Records", VAT "310122393500003", timestamp "2022-04-25T15:30:00Z",
// total "1000.00", VAT "150.00") — this implementation reproduces their
// published Base64 output byte-for-byte.
export interface QrPayloadInput {
  sellerName: string;
  vatRegistrationNumber: string;
  // Invoice issue date (YYYY-MM-DD, the same date shown on the document as
  // "Invoice date") and the real captured issue time (HH:mm, 24-hour) —
  // combined into the ISO 8601 timestamp ZATCA's Tag 3 requires. Stamped
  // directly with a UTC "Z" marker with no timezone conversion, same
  // treatment issueDate itself has always had (the entered clock time is
  // taken as-is, not converted from the browser's local zone). Using these
  // captured values rather than `new Date()` at call time keeps the QR
  // identical between the live client-side preview and what gets persisted
  // moments later on save — the same invariant the rest of this payload
  // already relies on.
  issueDate: string;
  issueTime: string;
  totalAmount: { toFixed(decimalPlaces: number): string };
  vatAmount: { toFixed(decimalPlaces: number): string };
}

const MAX_TLV_VALUE_BYTES = 255; // length is a single unsigned byte

function tlvField(tag: number, value: string): Uint8Array {
  const valueBytes = new TextEncoder().encode(value);
  if (valueBytes.length > MAX_TLV_VALUE_BYTES) {
    throw new Error(
      `ZATCA QR field (tag ${tag}) is ${valueBytes.length} UTF-8 bytes, exceeding the ${MAX_TLV_VALUE_BYTES}-byte TLV length limit.`
    );
  }
  const field = new Uint8Array(2 + valueBytes.length);
  field[0] = tag;
  field[1] = valueBytes.length;
  field.set(valueBytes, 2);
  return field;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// btoa/String.fromCharCode rather than Buffer: this runs both server-side
// (Server Actions) and client-side (the live invoice builder preview),
// and Buffer isn't available in the browser.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildInvoiceQrPayload(input: QrPayloadInput): string {
  const timestamp = `${input.issueDate}T${input.issueTime}:00Z`;
  const bytes = concatBytes([
    tlvField(1, input.sellerName),
    tlvField(2, input.vatRegistrationNumber),
    tlvField(3, timestamp),
    tlvField(4, input.totalAmount.toFixed(2)),
    tlvField(5, input.vatAmount.toFixed(2)),
  ]);
  return bytesToBase64(bytes);
}
