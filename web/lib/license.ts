import { prisma } from "@/lib/prisma";

export async function checkUserLicense(email: string) {
  const result = await prisma.$queryRawUnsafe(`
    SELECT
      LEAST(t."licenseEndsAt", m."accessEndsAt") AS "effectiveEndsAt",
      CASE
        WHEN t."licenseStartsAt" IS NULL OR t."licenseEndsAt" IS NULL THEN 'TENANT_NO_LICENSE'
        WHEN NOW() < t."licenseStartsAt" OR NOW() > t."licenseEndsAt" THEN 'TENANT_LICENSE_INACTIVE'
        WHEN m."accessStartsAt" IS NULL OR m."accessEndsAt" IS NULL THEN 'USER_NO_ACCESS'
        WHEN NOW() < m."accessStartsAt" OR NOW() > m."accessEndsAt" THEN 'USER_ACCESS_INACTIVE'
        ELSE 'ACTIVE'
      END AS "licenseState"
    FROM "User" u
    JOIN "Membership" m ON m."userId" = u."id" AND m."status" = 'ACTIVE'
    JOIN "Tenant" t ON t."id" = m."tenantId"
    WHERE u."email" = $1
    LIMIT 1
  `, email);

  return result?.[0] ?? null;
}