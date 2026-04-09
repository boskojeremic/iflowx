import path from "node:path";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "node:fs/promises";
import * as sql from "mssql";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const {
  SQLSERVER_HOST,
  SQLSERVER_DB,
  SQLSERVER_USER,
  SQLSERVER_PASSWORD,
  SQLSERVER_PORT,
  REPORT_GROUP_CODE = "LEGACY",
  TENANT_ID,
} = process.env;

if (!SQLSERVER_HOST || !SQLSERVER_DB || !SQLSERVER_USER || !SQLSERVER_PASSWORD) {
  throw new Error(
    "Missing required env vars. Required: SQLSERVER_HOST, SQLSERVER_DB, SQLSERVER_USER, SQLSERVER_PASSWORD"
  );
}

if (!TENANT_ID) {
  throw new Error("Missing required env var: TENANT_ID");
}

const mssqlConfig: sql.config = {
  server: SQLSERVER_HOST,
  database: SQLSERVER_DB,
  user: SQLSERVER_USER,
  password: SQLSERVER_PASSWORD,
  port: SQLSERVER_PORT ? Number(SQLSERVER_PORT) : 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

type SqlReportRow = {
  legacy_id: number;
  report_name: string;
};

function slugCode(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s/-]+/g, "_")
    .replace(/_+/g, "_")
    .toUpperCase();
}

async function main() {
  console.log("Connecting to SQL Server...");
  const pool = await sql.connect(mssqlConfig);

  console.log(
    `Loading ReportGroup by code = ${REPORT_GROUP_CODE} for tenant = ${TENANT_ID} ...`
  );

  const reportGroup = await prisma.reportGroup.findFirst({
    where: {
      code: REPORT_GROUP_CODE,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  if (!reportGroup) {
    throw new Error(
      `ReportGroup with code '${REPORT_GROUP_CODE}' not found in Neon for tenant '${TENANT_ID}'.`
    );
  }

  console.log(
    `Using ReportGroup: ${reportGroup.name} (${reportGroup.code}) [${reportGroup.id}]`
  );

  console.log("Reading legacy report_definitions from SQL Server...");
  const result = await pool.request().query<SqlReportRow>(`
    SELECT
      id AS legacy_id,
      report_name
    FROM common.report_definitions
    ORDER BY id
  `);

  const rows = result.recordset;
  console.log(`Found ${rows.length} legacy report definitions.`);

  const existing = await prisma.reportDefinition.findMany({
    where: {
      reportGroupId: reportGroup.id,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  const existingByCode = new Map(existing.map((x) => [x.code, x]));
  const usedCodes = new Set(existing.map((x) => x.code));

  const idMap: Record<string, string> = {};
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    let code = slugCode(row.report_name);

    if (!code) {
      code = `LEGACY_REPORT_${row.legacy_id}`;
    }

    if (usedCodes.has(code) && existingByCode.get(code)?.name !== row.report_name) {
      code = `${code}_${row.legacy_id}`;
    }

    usedCodes.add(code);

    const existingReport = existingByCode.get(code);

    if (existingReport) {
      const res = await prisma.reportDefinition.update({
        where: { id: existingReport.id },
        data: {
          name: row.report_name,
          description: `Imported from legacy SQL report_definitions (${row.legacy_id})`,
          isActive: true,
        },
        select: { id: true },
      });

      idMap[String(row.legacy_id)] = res.id;
      updated++;
    } else {
      const res = await prisma.reportDefinition.create({
        data: {
          id: randomUUID(),
          reportGroupId: reportGroup.id,
          code,
          name: row.report_name,
          description: `Imported from legacy SQL report_definitions (${row.legacy_id})`,
          sortOrder: 100,
          isActive: true,
        },
        select: { id: true },
      });

      existingByCode.set(code, { id: res.id, code, name: row.report_name });
      idMap[String(row.legacy_id)] = res.id;
      created++;
    }
  }

  const outPath = path.join(process.cwd(), "scripts", "report-id-map.json");
  await fs.writeFile(outPath, JSON.stringify(idMap, null, 2), "utf8");

  console.log("Done.");
  console.log({
    created,
    updated,
    idMapFile: outPath,
  });

  await pool.close();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});