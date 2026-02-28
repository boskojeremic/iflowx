-- DropIndex
DROP INDEX "Membership_tenantId_idx";

-- DropIndex
DROP INDEX "Membership_userId_idx";

-- DropIndex
DROP INDEX "idx_membership_access_end";

-- AlterTable
ALTER TABLE "Membership" DROP COLUMN "accessEndsAt",
DROP COLUMN "accessStartsAt",
ADD COLUMN     "createdByUserId" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Membership_createdByUserId_idx" ON "Membership"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

