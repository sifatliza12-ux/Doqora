import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.create({
    data: {
      name: "Sarah R. A. Al-Ruwaili Est.",
      nameAr: "مؤسسة ساره رياض امدني الرويلي",
      crNumber: "4650240081",
      vatNumber: "300556677880003",
      address: "Kingdom of Saudi Arabia – Jeddah – Al-Ruwais Dist. – Hail St.",
      currencyCode: "SAR",
      invoicePrefix: "INV-",
      defaultLanguageMode: "BILINGUAL",
      defaultTemplate: "saudi-bilingual",
    },
  });

  const bankAccount = await prisma.businessBankAccount.create({
    data: {
      businessId: business.id,
      bankName: "National Commercial Bank – Jeddah",
      accountName: business.name,
      accountNumber: "01400036758704",
      iban: "SA6610000001400036758704",
      swiftCode: "NCBKSAJE",
      isDefault: true,
    },
  });

  const customer1 = await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "Saudi Radwa Food Co. Ltd.",
      companyNameAr: "سعودي رادوا للأغذية المحدودة",
      vatNumber: "300281871800003",
    },
  });

  await prisma.customer.create({
    data: {
      businessId: business.id,
      name: "ABC Trading Co.",
      vatNumber: "300112233440003",
    },
  });

  const subtotal = 246183.2;
  const vatAmount = 36927.48;
  const discountAmount = 0;
  const totalAmount = 283110.68;

  const invoice = await prisma.invoice.create({
    data: {
      businessId: business.id,
      customerId: customer1.id,
      invoiceNumber: "INV-0196",
      invoiceType: "TAX_INVOICE",
      status: "DRAFT",
      issueDate: new Date("2026-08-20"),
      dueDate: new Date("2026-09-05"),
      currencyCode: business.currencyCode,
      languageMode: "BILINGUAL",
      customerSnapshot: {
        name: customer1.name,
        companyNameAr: customer1.companyNameAr,
        vatNumber: customer1.vatNumber,
      },
      businessSnapshot: {
        name: business.name,
        nameAr: business.nameAr,
        crNumber: business.crNumber,
        vatNumber: business.vatNumber,
        address: business.address,
      },
      subtotal,
      discountAmount,
      vatAmount,
      totalAmount,
      amountInWordsEn:
        "Two hundred eighty-three thousand one hundred ten riyals and sixty-eight halalas.",
      amountInWordsAr:
        "مائتان وثلاثة وثمانون ألفًا ومائة وعشرة ريالات وثمانية وستون هللة.",
      items: {
        create: [
          {
            description: "Monthly labor cost",
            descriptionAr: "تكلفة العمالة الشهرية",
            quantity: 93,
            rate: 2412.32,
            discount: 0,
            vatRate: 15,
            vatAmount: 33651.92,
            lineTotal: 224346.15,
            sortOrder: 0,
          },
          {
            description: "OT hours",
            descriptionAr: "ساعات العمل الإضافية",
            quantity: 3785.09,
            rate: 5.77,
            discount: 0,
            vatRate: 15,
            vatAmount: 3275.56,
            lineTotal: 21837.05,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  console.log("Seeded:");
  console.log({
    business: business.id,
    bankAccount: bankAccount.id,
    customer1: customer1.id,
    invoice: invoice.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
