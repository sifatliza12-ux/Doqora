import { InvoiceSheet } from "@/components/ui/InvoiceSheet";
import {
  amountInWords,
  bank,
  company,
  customer,
  invoiceMeta,
  lineItems,
  totals,
} from "./mock-data";

// Purely decorative "QR-like" placeholder — NOT a real QR code. 1 = dark
// cell, 0 = light cell, arranged to loosely evoke QR finder patterns.
const qrPattern = [
  [1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1],
];

function SectionDivider() {
  return <div className="border-t border-sheet-border" />;
}

/**
 * A block-level Arabic line stacked under an English counterpart at the
 * same left edge. dir="rtl" gives correct Arabic glyph/character order;
 * text-left (a physical, non-logical property) is required alongside it
 * — text-start would resolve to "right" once dir is rtl on this element,
 * which would break the shared left edge with the English line above it.
 */
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

export function InvoicePreview() {
  return (
    <InvoiceSheet>
      {/* Header */}
      <div className="flex flex-col items-center gap-1 px-8 pt-8 pb-6 text-center">
        <p className="text-xl font-semibold text-sheet-heading">{company.nameEn}</p>
        <p dir="rtl" className="text-xl font-semibold text-sheet-heading">
          {company.nameAr}
        </p>
        <p className="mt-1 text-sm text-sheet-muted-foreground">{company.taglineEn}</p>
        <p dir="rtl" className="text-sm text-sheet-muted-foreground">
          {company.taglineAr}
        </p>
      </div>
      <div className="border-t-2 border-sheet-foreground" />
      <div className="px-8 py-4 text-center">
        <p className="text-lg font-semibold text-sheet-heading">
          Tax invoice / <span dir="rtl">فاتورة ضريبية</span>
        </p>
      </div>

      <SectionDivider />

      {/* Bill-to + invoice metadata */}
      <div className="flex flex-col gap-6 px-8 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-sheet-muted-foreground">
            Bill to / <span dir="rtl">الفاتورة إلى</span>
          </p>
          <p className="text-base font-semibold text-sheet-heading">{customer.nameEn}</p>
          <ArabicLine className="text-base font-semibold text-sheet-heading">
            {customer.nameAr}
          </ArabicLine>
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-sm sm:justify-items-end">
          <span className="text-sheet-muted-foreground">
            Invoice no. / <span dir="rtl">رقم الفاتورة</span>
          </span>
          <span className="text-end font-medium text-sheet-heading">
            {invoiceMeta.number}
          </span>
          <span className="text-sheet-muted-foreground">
            Invoice date / <span dir="rtl">تاريخ الفاتورة</span>
          </span>
          <span className="text-end font-medium text-sheet-heading">
            {invoiceMeta.issueDate}
          </span>
          <span className="text-sheet-muted-foreground">
            Due date / <span dir="rtl">تاريخ الاستحقاق</span>
          </span>
          <span className="text-end font-medium text-sheet-heading">
            {invoiceMeta.dueDate}
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
            {lineItems.map((item) => (
              <tr
                key={item.descriptionEn}
                className="border-b border-sheet-border last:border-b-0"
              >
                <td className="py-3 pe-2 align-top">
                  <p className="text-sheet-foreground">{item.descriptionEn}</p>
                  <ArabicLine className="text-sheet-foreground">
                    {item.descriptionAr}
                  </ArabicLine>
                </td>
                <td className="px-2 py-3 align-top text-end text-sheet-foreground">
                  {item.qty}
                </td>
                <td className="px-2 py-3 align-top text-end text-sheet-foreground">
                  {item.rate}
                </td>
                <td className="px-2 py-3 align-top text-end text-sheet-foreground">
                  {item.vat}
                </td>
                <td className="ps-2 py-3 align-top text-end text-sheet-foreground">
                  {item.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SectionDivider />

      {/* Totals */}
      <div className="flex flex-col items-end gap-2 px-8 py-6">
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-sheet-muted-foreground">
            Total / <span dir="rtl">الإجمالي</span>
          </span>
          <span className="font-medium text-sheet-heading">{totals.total}</span>
        </div>
        <div className="flex w-full max-w-xs justify-between text-sm">
          <span className="text-sheet-muted-foreground">
            VAT 15% / <span dir="rtl">ضريبة القيمة المضافة</span>
          </span>
          <span className="font-medium text-sheet-heading">{totals.vat}</span>
        </div>
        <div className="mt-2 flex w-full max-w-xs flex-col items-end gap-1 border-t border-sheet-border pt-3">
          <span className="text-sm text-sheet-muted-foreground">
            Net amount / <span dir="rtl">المبلغ الصافي</span>
          </span>
          <span className="text-3xl font-bold text-copper">{totals.netAmount}</span>
        </div>
      </div>

      <SectionDivider />

      {/* Amount in words */}
      <div className="flex flex-col gap-4 px-8 py-6 text-sm">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sheet-heading">Amount in words:</p>
          <p className="text-sheet-muted-foreground">{amountInWords.en}</p>
        </div>
        <div dir="rtl" className="flex flex-col gap-1 text-left">
          <p className="font-medium text-sheet-heading">المبلغ كتابة:</p>
          <p className="text-sheet-muted-foreground">{amountInWords.ar}</p>
        </div>
      </div>

      <SectionDivider />

      {/* Footer: bank details + decorative QR placeholder */}
      <div className="p-8">
        <div className="grid grid-cols-1 gap-6 rounded-sheet border border-sheet-border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium text-sheet-heading">
              Bank details / <span dir="rtl">تفاصيل الحساب البنكي</span>
            </p>
            <p className="text-sheet-muted-foreground">IBAN: {bank.iban}</p>
            <p className="text-sheet-muted-foreground">Swift: {bank.swift}</p>
          </div>
          <div
            className="grid h-20 w-20 grid-cols-7 grid-rows-7 self-center border border-sheet-border sm:justify-self-end"
            aria-hidden="true"
          >
            {qrPattern.flat().map((cell, i) => (
              <div key={i} className={cell ? "bg-sheet-foreground" : "bg-sheet-background"} />
            ))}
          </div>
        </div>
      </div>
    </InvoiceSheet>
  );
}
