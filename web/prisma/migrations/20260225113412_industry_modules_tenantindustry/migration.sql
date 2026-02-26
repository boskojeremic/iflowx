/*
  Warnings:

  - You are about to drop the column `platformId` on the `Module` table. All the data in the column will be lost.
  - You are about to drop the `Platform` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TenantPlatform` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[industryId,code]` on the table `Module` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `industryId` to the `Module` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Module" DROP CONSTRAINT "Module_platformId_fkey";

-- DropForeignKey
ALTER TABLE "Platform" DROP CONSTRAINT "Platform_industryId_fkey";

-- DropForeignKey
ALTER TABLE "TenantPlatform" DROP CONSTRAINT "TenantPlatform_platformId_fkey";

-- DropForeignKey
ALTER TABLE "TenantPlatform" DROP CONSTRAINT "TenantPlatform_tenantId_fkey";

-- DropIndex
DROP INDEX "Module_platformId_code_key";

-- DropIndex
DROP INDEX "Module_platformId_idx";

-- AlterTable
ALTER TABLE "Module" DROP COLUMN "platformId",
ADD COLUMN     "industryId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Platform";

-- DropTable
DROP TABLE "TenantPlatform";

-- CreateTable
CREATE TABLE "TenantIndustry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(6),
    "endsAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantIndustry_tenantId_idx" ON "TenantIndustry"("tenantId");

-- CreateIndex
CREATE INDEX "TenantIndustry_industryId_idx" ON "TenantIndustry"("industryId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantIndustry_tenantId_industryId_key" ON "TenantIndustry"("tenantId", "industryId");

-- CreateIndex
CREATE INDEX "Module_industryId_idx" ON "Module"("industryId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_industryId_code_key" ON "Module"("industryId", "code");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantIndustry" ADD CONSTRAINT "TenantIndustry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantIndustry" ADD CONSTRAINT "TenantIndustry_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
