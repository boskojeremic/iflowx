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

async function main() {
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

  const pool = await new sql.ConnectionPool(sqlConfig).connect();

  const result = await pool.request().query(`
    SELECT
      [ID],
      [roles_abbreviation],
      [roles_name]
    FROM [common].[roles]
    ORDER BY [ID]
  `);

  const rows = result.recordset as Array<{
    ID: number;
    roles_abbreviation: string | null;
    roles_name: string | null;
  }>;

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const legacySqlId = Number(row.ID);
    const code = row.roles_abbreviation?.trim() || null;
    const name = row.roles_name?.trim() || null;

    if (!name || !code) continue;

    const existing = await prisma.operationalFunction.findUnique({
      where: {
        legacySqlId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      await prisma.operationalFunction.create({
        data: {
          legacySqlId,
          code,
          abbreviation: code,
          name,
        },
      });
      created++;
    } else {
      await prisma.operationalFunction.update({
        where: {
          legacySqlId,
        },
        data: {
          code,
          abbreviation: code,
          name,
        },
      });
      updated++;
    }
  }

  await pool.close();

  console.log({
    ok: true,
    totalSqlRows: rows.length,
    created,
    updated,
  });
}

main()
  .catch((error) => {
    console.error("IMPORT FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });