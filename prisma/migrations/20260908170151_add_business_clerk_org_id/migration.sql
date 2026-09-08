-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "clerkOrgId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Business_clerkOrgId_key" ON "Business"("clerkOrgId");
