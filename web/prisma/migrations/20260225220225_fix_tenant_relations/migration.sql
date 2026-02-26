/*
  Warnings:

  - You are about to drop the column `licenseEndsAt` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `licenseStartsAt` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `seatLimit` on the `Tenant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_tenant_license_end";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "licenseEndsAt",
DROP COLUMN "licenseStartsAt",
DROP COLUMN "seatLimit";

-- AlterTable
ALTER TABLE "TenantModule" ADD COLUMN     "seatLimit" INTEGER NOT NULL DEFAULT 1;
