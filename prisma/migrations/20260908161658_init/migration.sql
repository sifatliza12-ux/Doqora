-- CreateEnum
CREATE TYPE "LanguageMode" AS ENUM ('ENGLISH', 'ARABIC', 'BILINGUAL');

-- CreateEnum
CREATE TYPE "BusinessRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('TAX_INVOICE', 'STANDARD', 'PROFORMA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "address" TEXT,
    "addressAr" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "crNumber" TEXT,
    "vatNumber" TEXT,
    "businessActivity" TEXT,
    "logoUrl" TEXT,
    "brandColorPrimary" TEXT NOT NULL DEFAULT '#10B981',
    "brandColorAccent" TEXT NOT NULL DEFAULT '#C58B3A',
    "currencyCode" TEXT NOT NULL DEFAULT 'SAR',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "defaultLanguageMode" "LanguageMode" NOT NULL DEFAULT 'BILINGUAL',
    "defaultTemplate" TEXT NOT NULL DEFAULT 'saudi-bilingual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" "BusinessRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessBankAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "swiftCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameAr" TEXT,
    "companyName" TEXT,
    "companyNameAr" TEXT,
    "vatNumber" TEXT,
    "crNumber" TEXT,
    "address" TEXT,
    "addressAr" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "poBox" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceType" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "poNumber" TEXT,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "notesAr" TEXT,
    "languageMode" "LanguageMode" NOT NULL,
    "customerSnapshot" JSONB NOT NULL,
    "businessSnapshot" JSONB NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "discountAmount" DECIMAL(14,2) NOT NULL,
    "vatAmount" DECIMAL(14,2) NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "amountInWordsEn" TEXT,
    "amountInWordsAr" TEXT,
    "qrCodeData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" TEXT,
    "rate" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "vatAmount" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

-- CreateIndex
CREATE INDEX "BusinessMember_businessId_idx" ON "BusinessMember"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMember_userId_businessId_key" ON "BusinessMember"("userId", "businessId");

-- CreateIndex
CREATE INDEX "BusinessBankAccount_businessId_idx" ON "BusinessBankAccount"("businessId");

-- CreateIndex
CREATE INDEX "Customer_businessId_idx" ON "Customer"("businessId");

-- CreateIndex
CREATE INDEX "Invoice_businessId_idx" ON "Invoice"("businessId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_businessId_invoiceNumber_key" ON "Invoice"("businessId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessBankAccount" ADD CONSTRAINT "BusinessBankAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
