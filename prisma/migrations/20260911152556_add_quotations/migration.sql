-- AlterEnum
ALTER TYPE "InvoiceType" ADD VALUE 'QUOTATION';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "quotePrefix" TEXT NOT NULL DEFAULT 'QUO-',
ADD COLUMN     "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "convertedToInvoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_convertedToInvoiceId_key" ON "Invoice"("convertedToInvoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_convertedToInvoiceId_fkey" FOREIGN KEY ("convertedToInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
