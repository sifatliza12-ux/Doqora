// Mock data only — Milestone 4 (UI-first). No calculation logic: every
// number below is a hardcoded literal, not derived from the others.

export const company = {
  nameEn: "Sarah R. A. Al-Ruwaili Est.",
  nameAr: "مؤسسة ساره رياض امدني الرويلي",
  taglineEn: "Operations & maintenance",
  taglineAr: "التشغيل والصيانة",
  crNumber: "4650240081",
  vatNumber: "300556677880003",
  address: "Riyadh, Saudi Arabia",
};

export const customer = {
  nameEn: "Saudi Radwa Food Co. Ltd.",
  nameAr: "سعودي رادوا للأغذية المحدودة",
};

export const invoiceMeta = {
  number: "196",
  type: "Tax Invoice",
  issueDate: "20-Aug-2026",
  dueDate: "05-Sep-2026",
};

export interface LineItem {
  descriptionEn: string;
  descriptionAr: string;
  qty: string;
  rate: string;
  vat: string;
  amount: string;
}

export const lineItems: LineItem[] = [
  {
    descriptionEn: "Monthly labor cost",
    descriptionAr: "تكلفة العمالة الشهرية",
    qty: "93",
    rate: "2,412.32",
    vat: "33,651.92",
    amount: "224,346.15",
  },
  {
    descriptionEn: "OT hours",
    descriptionAr: "ساعات العمل الإضافية",
    qty: "3,785.09",
    rate: "5.77",
    vat: "3,275.56",
    amount: "21,837.05",
  },
];

export const totals = {
  total: "246,183.20",
  vat: "36,927.48",
  netAmount: "283,110.68",
};

export const amountInWords = {
  en: "Two hundred eighty-three thousand one hundred ten riyals and sixty-eight halalas.",
  ar: "مائتان وثلاثة وثمانون ألفًا ومائة وعشرة ريالات وثمانية وستون هللة.",
};

// No mock bank name — none of the locked mockups render one, only IBAN +
// Swift under "Bank details / تفاصيل الحساب البنكي". A `name` field can be
// added here once real data exists (the Prisma schema already has
// BusinessBankAccount.bankName for that).
export const bank = {
  iban: "SA6610000001400036758704",
  swift: "NCBKSAJE",
};
