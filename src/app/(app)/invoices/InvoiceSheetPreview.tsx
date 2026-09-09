import type { Business, BusinessBankAccount, InvoiceType } from "@prisma/client";
import { InvoiceSheet } from "@/components/ui/InvoiceSheet";
import type { CalculatedInvoice } from "@/lib/invoice-calculations";
import { InvoiceQrCode } from "./InvoiceQrCode";
import type { LineItemDraft } from "./line-item-draft";

// Amount-in-words generation (English/Arabic) is a separate future
// milestone — this stays as the same static placeholder text the locked
// mock already showed, deliberately not derived from totalAmount.
const amountInWordsPlaceholder = {
  en: "Two hundred eighty-three thousand one hundred ten riyals and sixty-eight halalas.",
  ar: "مائتان وثلاثة وثمانون ألفًا ومائة وعشرة ريالات وثمانية وستون هللة.",
};

const INVOICE_TYPE_LABELS: Record<InvoiceType, { en: string; ar: string }> = {
  TAX_INVOICE: { en: "Tax invoice", ar: "فاتورة ضريبية" },
  STANDARD: { en: "Invoice", ar: "فاتورة" },
  PROFORMA: { en: "Proforma invoice", ar: "فاتورة مبدئية" },
};

function SectionDivider() {
  return <div className="border-t border-sheet-border" />;
}

function ArabicLine({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p dir="rtl" className={`text-left ${className}`}>
      {children}
    </p>
  );
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(value: { toFixed(dp: number): string }): string {
  return Number(value.toFixed(2)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceSheetPreview({
  business,
  bankAccount,
  customerName,
  customerNameAr,
  invoiceNumber,
  invoiceType,
  issueDate,
  dueDate,
  lineItems,
  calculated,
  qrPayload,
}: {
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
}) {
  const typeLabel = INVOICE_TYPE_LABELS[invoiceType];

  return (
    <InvoiceSheet>
      {/* Header */}
      <div className="flex flex-col items-center gap-1 px-8 pt-8 pb-6 text-center">
        <p className="text-xl font-semibold text-sheet-heading">{business.name}</p>
        {business.nameAr && (
          <p dir="rtl" className="text-xl font-semibold text-sheet-heading">
            {business.nameAr}
          </p>
        )}
      </div>
      <div className="border-t-2 border-sheet-foreground" />
      <div className="px-8 py-4 text-center">
        <p className="text-lg font-semibold text-sheet-heading">
          {typeLabel.en} / <span dir="rtl">{typeLabel.ar}</span>
        </p>
      </div>

      <SectionDivider />

      {/* Bill-to + invoice metadata */}
      <div className="flex flex-col gap-6 px-8 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-sheet-muted-foreground">
            Bill to / <span dir="rtl">الفاتورة إلى</span>
          </p>
          <p className="text-base font-semibold text-sheet-heading">{customerName}</p>
          {customerNameAr && (
            <ArabicLine className="text-base font-semibold text-sheet-heading">
              {customerNameAr}
            </ArabicLine>
          )}
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-sm sm:justify-items-end">
          <span className="text-sheet-muted-foreground">
            Invoice no. / <span dir="rtl">رقم الفاتورة</span>
          </span>
          <span className="text-end font-medium text-sheet-heading">{invoiceNumber}</span>
          <span className="text-sheet-muted-foreground">
            Invoice date / <span dir="rtl">تاريخ الفاتورة</span>
          </span>
          <span className="text-end font-medium text-sheet-heading">
            {formatDisplayDate(issueDate)}
          </span>
          <span className="text-sheet-muted-foreground">
            Due date / <span dir="rtl">تاريخ الاستحقاق</span>
          </span>
          <span className="text-end font-medium text-sheet-heading">
            {formatDisplayDate(dueDate)}
          </span>
        </div>
      </div>

      <SectionDivider />

      {/* Line items */}
      <div className="overflow-x-auto px-8 py-6">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="border-b border-sheet-border">
              <th className="py-2 pe-2 text-start font-medium text-sheet-muted-foreground">
                Description / <span dir="rtl">الوصف</span>
              </th>
              <th className="px-2 py-2 text-end font-medium text-sheet-muted-foreground">
                Qty / <span dir="rtl">الكمية</span>
              </th>
              <th className="px-2 py-2 text-end font-medium text-sheet-muted-foreground">
                Rate / <span dir="rtl">السعر</span>
              </th>
              <th className="px-2 py-2 text-end font-medium text-sheet-muted-foreground">
                VAT / <span dir="rtl">الضريبة</span>
              </th>
              <th className="ps-2 py-2 text-end font-medium text-sheet-muted-foreground">
                Amount / <span dir="rtl">المبلغ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {calculated.lines.map((line, index) => {
              const draft = lineItems[index];
              return (
                <tr
                  key={draft?.key ?? index}
                  className="border-b border-sheet-border last:border-b-0"
                >
                  <td className="py-3 pe-2 align-top">
                    <p className="text-sheet-foreground">{draft?.description || "—"}</p>
                    {draft?.descriptionAr && (
                      <ArabicLine className="text-sheet-foreground">
                        {draft.descriptionAr}
                      </ArabicLine>
                    )}
                  </td>
                  <td className="px-2 py-3 align-top text-end text-sheet-foreground">
                    {line.quantity.toString()}
                  </td>
                  <td className="px-2 py-3 align-top text-end text-sheet-foreground">
                    {formatMoney(line.rate)}
                  </td>
                  <td className="px-2 py-3 align-top text-end text-sheet-foreground">
                    {formatMoney(line.vatAmount)}
                  </td>
                  <td className="ps-2 py-3 align-top text-end text-sheet-foreground">
                    {formatMoney(line.lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SectionDivider />

      {/* Totals */}
      <div className="flex flex-col items-end gap-2 px-8 py-6">
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-sheet-muted-foreground">
            Subtotal / <span dir="rtl">المجموع الفرعي</span>
          </span>
          <span className="font-medium text-sheet-heading">{formatMoney(calculated.subtotal)}</span>
        </div>
        {calculated.discountAmount.greaterThan(0) && (
          <div className="flex w-full max-w-xs justify-between text-sm">
            <span className="text-sheet-muted-foreground">
              Discount / <span dir="rtl">الخصم</span>
            </span>
            <span className="font-medium text-sheet-heading">
              −{formatMoney(calculated.discountAmount)}
            </span>
          </div>
        )}
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-sheet-muted-foreground">
            VAT / <span dir="rtl">ضريبة القيمة المضافة</span>
          </span>
          <span className="font-medium text-sheet-heading">{formatMoney(calculated.vatAmount)}</span>
        </div>
        <div className="mt-2 flex w-full max-w-xs flex-col items-end gap-1 border-t border-sheet-border pt-3">
          <span className="text-sm text-sheet-muted-foreground">
            Net amount / <span dir="rtl">المبلغ الصافي</span>
          </span>
          <span className="text-3xl font-bold text-copper">
            {formatMoney(calculated.totalAmount)}
          </span>
        </div>
      </div>

      <SectionDivider />

      {/* Amount in words — static placeholder, real generation is a future milestone */}
      <div className="flex flex-col gap-4 px-8 py-6 text-sm">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sheet-heading">Amount in words:</p>
          <p className="text-sheet-muted-foreground">{amountInWordsPlaceholder.en}</p>
        </div>
        <div dir="rtl" className="flex flex-col gap-1 text-left">
          <p className="font-medium text-sheet-heading">المبلغ كتابة:</p>
          <p className="text-sheet-muted-foreground">{amountInWordsPlaceholder.ar}</p>
        </div>
      </div>

      <SectionDivider />

      {/* Footer: bank details + QR code */}
      <div className="p-8">
        <div className="grid grid-cols-1 gap-6 rounded-sheet border border-sheet-border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-sheet-heading">
              Bank details / <span dir="rtl">تفاصيل الحساب البنكي</span>
            </p>
            {bankAccount ? (
              <>
                <p className="text-sheet-muted-foreground">IBAN: {bankAccount.iban}</p>
                {bankAccount.swiftCode && (
                  <p className="text-sheet-muted-foreground">Swift: {bankAccount.swiftCode}</p>
                )}
              </>
            ) : (
              <p className="text-sheet-muted-foreground">No bank account on file.</p>
            )}
          </div>
          <InvoiceQrCode
            data={qrPayload}
            className="h-20 w-20 self-center border border-sheet-border sm:justify-self-end"
          />
        </div>
      </div>
    </InvoiceSheet>
  );
}
