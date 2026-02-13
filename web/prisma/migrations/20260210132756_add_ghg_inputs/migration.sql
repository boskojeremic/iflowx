/*
  Warnings:

  - You are about to drop the `ActivityData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmissionSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Site` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenantId,ym]` on the table `ReportingPeriod` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `ReportingPeriod` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('SCOPE_1', 'SCOPE_2', 'SCOPE_3');

-- CreateEnum
CREATE TYPE "InputMethod" AS ENUM ('MANUAL', 'CSV', 'OPCUA', 'CEMS');

-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('FUEL_GAS_NM3', 'DIESEL_L', 'GASOLINE_L', 'ELECTRICITY_KWH', 'CEMS_CO2_KG', 'CEMS_CO2_T', 'CEMS_CO2_TPH', 'CEMS_CO2_CONC_PCT', 'STACK_FLOW_NM3H');

-- CreateEnum
CREATE TYPE "EmitterStrategy" AS ENUM ('CALCULATED_FROM_ACTIVITY', 'MEASURED_FROM_CEMS', 'HYBRID');

-- DropForeignKey
ALTER TABLE "ActivityData" DROP CONSTRAINT "ActivityData_periodId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityData" DROP CONSTRAINT "ActivityData_siteId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityData" DROP CONSTRAINT "ActivityData_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "Site" DROP CONSTRAINT "Site_organizationId_fkey";

-- DropIndex
DROP INDEX "ReportingPeriod_ym_key";

-- AlterTable
ALTER TABLE "ReportingPeriod" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ActivityData";

-- DropTable
DROP TABLE "EmissionSource";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "Site";

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emitter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "ScopeType" NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL,
    "strategy" "EmitterStrategy" NOT NULL DEFAULT 'CALCULATED_FROM_ACTIVITY',
    "tag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emitter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GHGInput" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "emitterId" TEXT,
    "inputType" "InputType" NOT NULL,
    "method" "InputMethod" NOT NULL,
    "value" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GHGInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "emitterId" TEXT NOT NULL,
    "co2" DECIMAL(18,6) NOT NULL,
    "ch4" DECIMAL(18,6) NOT NULL,
    "n2o" DECIMAL(18,6) NOT NULL,
    "co2e" DECIMAL(18,6) NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmissionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_idx" ON "Asset"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_tenantId_code_key" ON "Asset"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Emitter_tenantId_idx" ON "Emitter"("tenantId");

-- CreateIndex
CREATE INDEX "Emitter_assetId_idx" ON "Emitter"("assetId");

-- CreateIndex
CREATE INDEX "Emitter_tenantId_scope_idx" ON "Emitter"("tenantId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Emitter_tenantId_assetId_name_key" ON "Emitter"("tenantId", "assetId", "name");

-- CreateIndex
CREATE INDEX "GHGInput_tenantId_idx" ON "GHGInput"("tenantId");

-- CreateIndex
CREATE INDEX "GHGInput_periodId_idx" ON "GHGInput"("periodId");

-- CreateIndex
CREATE INDEX "GHGInput_assetId_idx" ON "GHGInput"("assetId");

-- CreateIndex
CREATE INDEX "GHGInput_emitterId_idx" ON "GHGInput"("emitterId");

-- CreateIndex
CREATE UNIQUE INDEX "GHGInput_tenantId_periodId_emitterId_inputType_key" ON "GHGInput"("tenantId", "periodId", "emitterId", "inputType");

-- CreateIndex
CREATE INDEX "EmissionResult_tenantId_idx" ON "EmissionResult"("tenantId");

-- CreateIndex
CREATE INDEX "EmissionResult_periodId_idx" ON "EmissionResult"("periodId");

-- CreateIndex
CREATE INDEX "EmissionResult_assetId_idx" ON "EmissionResult"("assetId");

-- CreateIndex
CREATE INDEX "EmissionResult_emitterId_idx" ON "EmissionResult"("emitterId");

-- CreateIndex
CREATE INDEX "ReportingPeriod_tenantId_idx" ON "ReportingPeriod"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingPeriod_tenantId_ym_key" ON "ReportingPeriod"("tenantId", "ym");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingPeriod" ADD CONSTRAINT "ReportingPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emitter" ADD CONSTRAINT "Emitter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emitter" ADD CONSTRAINT "Emitter_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GHGInput" ADD CONSTRAINT "GHGInput_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GHGInput" ADD CONSTRAINT "GHGInput_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GHGInput" ADD CONSTRAINT "GHGInput_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GHGInput" ADD CONSTRAINT "GHGInput_emitterId_fkey" FOREIGN KEY ("emitterId") REFERENCES "Emitter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionResult" ADD CONSTRAINT "EmissionResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionResult" ADD CONSTRAINT "EmissionResult_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ReportingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionResult" ADD CONSTRAINT "EmissionResult_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionResult" ADD CONSTRAINT "EmissionResult_emitterId_fkey" FOREIGN KEY ("emitterId") REFERENCES "Emitter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
