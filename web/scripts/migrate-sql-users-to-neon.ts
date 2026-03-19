import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import sql from "mssql";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName ?? "", lastName ?? ""].join(" ").trim() || null;
}

async function main() {
  const tenantId = requireEnv("MIGRATION_TENANT_ID");

  const sqlConfig: sql.config = {
    user: requireEnv("SQLSERVER_USER"),
    password: requireEnv("SQLSERVER_PASSWORD"),
    server: requireEnv("SQLSERVER_HOST"),
    port: Number(process.env.SQLSERVER_PORT || 1433),
    database: requireEnv("SQLSERVER_DB"),
    options: {
      trustServerCertificate: true,
      encrypt: false,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, code: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const pool = await new sql.ConnectionPool(sqlConfig).connect();

  const result = await pool.request().query(`
    SELECT
      [id],
      [first_name],
      [last_name],
      [user_login],
      [email],
      [role_id],
      [is_admin]
    FROM [common].[users]
    WHERE ISNULL([email], '') <> ''
    ORDER BY [id]
  `);

  const rows = result.recordset as Array<{
    id: number;
    first_name: string | null;
    last_name: string | null;
    user_login: string | null;
    email: string | null;
    role_id: number | null;
    is_admin: boolean | number | null;
  }>;

  let createdUsers = 0;
  let updatedUsers = 0;
  let createdMemberships = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    const firstName = row.first_name?.trim() || null;
    const lastName = row.last_name?.trim() || null;
    const name = fullName(firstName, lastName);
    const userLogin = row.user_login?.trim() || null;
    const legacySqlId = Number(row.id);
    const legacyRoleId =
      row.role_id === null || row.role_id === undefined ? null : Number(row.role_id);
    const isTenantAdmin = !!row.is_admin;

    if (!email) {
      skipped += 1;
      continue;
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          firstName,
          lastName,
          userLogin,
          legacySqlId,
          legacyRoleId,
          isTenantAdmin,
        },
        select: { id: true },
      });
      createdUsers += 1;
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          firstName,
          lastName,
          userLogin,
          legacySqlId,
          legacyRoleId,
          isTenantAdmin,
        },
      });
      updatedUsers += 1;
    }

    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        tenantId,
      },
      select: { id: true },
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId: user.id,
          tenantId,
          role: isTenantAdmin ? "ADMIN" : "VIEWER",
          status: "ACTIVE",
        },
      });
      createdMemberships += 1;
    }
  }

  await pool.close();

  console.log({
    ok: true,
    tenant: `${tenant.name} (${tenant.code})`,
    totalSqlRows: rows.length,
    createdUsers,
    updatedUsers,
    createdMemberships,
    skipped,
  });
}

main()
  .catch((error) => {
    console.error("MIGRATION FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });