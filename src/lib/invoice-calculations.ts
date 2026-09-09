// Pure invoice math — no server/client-only APIs, safe to import from both a
// 'use client' live preview and a 'use server' save action, so the two can
// never compute different numbers for the same inputs.
//
// Rules (frozen spec):
//   Line amount    = qty × rate
//   Line VAT       = (amount − discount) × vatRate
//   Line total     = amount − discount + VAT
//   Invoice subtotal       = Σ(line amounts)
//   Invoice discountAmount = Σ(line discounts)
//   Invoice VAT            = Σ(line VATs)
//   Invoice total          = subtotal − discountAmount + VAT
//
// Every stored/displayed number is rounded to 2dp (3dp for quantity, matching
// InvoiceItem's Decimal(10,3) column) at the point it's produced here — both
// the live preview and the DB row read the same rounded values, so a save
// can never show cents different from what the user just saw on screen.
// Plain decimal.js, not Prisma's re-export — Prisma's runtime/library module
// pulls in Node-only machinery (node:module) that Turbopack can't put in a
// client bundle. decimal.js is a direct dependency of @prisma/client
// already, so this stays "one Decimal implementation" in practice; Prisma
// Client accepts plain decimal.js instances for Decimal fields via its
// DecimalJsLike duck-typing (d/e/s + toFixed()), so values round-trip fine.
import Decimal from "decimal.js";

export type DecimalInput = string | number | Decimal;

export interface LineItemCalcInput {
  quantity: DecimalInput;
  rate: DecimalInput;
  discount?: DecimalInput;
  vatRate?: DecimalInput;
}

export interface CalculatedLineItem {
  quantity: Decimal;
  rate: Decimal;
  discount: Decimal;
  vatRate: Decimal;
  amount: Decimal;
  vatAmount: Decimal;
  lineTotal: Decimal;
}

export interface CalculatedInvoice {
  lines: CalculatedLineItem[];
  subtotal: Decimal;
  discountAmount: Decimal;
  vatAmount: Decimal;
  totalAmount: Decimal;
}

export const DEFAULT_VAT_RATE = 15;

function toDecimal(value: DecimalInput | undefined, fallback: number): Decimal {
  if (value === undefined || value === null || value === "") return new Decimal(fallback);
  try {
    const parsed = new Decimal(value);
    return parsed.isFinite() ? parsed : new Decimal(fallback);
  } catch {
    return new Decimal(fallback);
  }
}

function money(value: Decimal): Decimal {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

function quantityPrecision(value: Decimal): Decimal {
  return value.toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
}

export function calculateLineItem(input: LineItemCalcInput): CalculatedLineItem {
  const quantity = quantityPrecision(toDecimal(input.quantity, 0));
  const rate = money(toDecimal(input.rate, 0));
  const discount = money(toDecimal(input.discount, 0));
  const vatRate = money(toDecimal(input.vatRate, DEFAULT_VAT_RATE));

  const amount = money(quantity.times(rate));
  const taxableBase = amount.minus(discount);
  const vatAmount = money(taxableBase.times(vatRate).dividedBy(100));
  const lineTotal = money(taxableBase.plus(vatAmount));

  return { quantity, rate, discount, vatRate, amount, vatAmount, lineTotal };
}

export function calculateInvoice(items: LineItemCalcInput[]): CalculatedInvoice {
  const lines = items.map(calculateLineItem);
  const zero = new Decimal(0);

  const subtotal = lines.reduce((sum, line) => sum.plus(line.amount), zero);
  const discountAmount = lines.reduce((sum, line) => sum.plus(line.discount), zero);
  const vatAmount = lines.reduce((sum, line) => sum.plus(line.vatAmount), zero);
  const totalAmount = subtotal.minus(discountAmount).plus(vatAmount);

  return {
    lines,
    subtotal: money(subtotal),
    discountAmount: money(discountAmount),
    vatAmount: money(vatAmount),
    totalAmount: money(totalAmount),
  };
}
