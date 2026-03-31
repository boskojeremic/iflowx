import path from "node:path";
import dotenv from "dotenv";

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
  MIGRATION_TENANT_ID,
  DEFAULT_CREATED_BY = "migration",
} = process.env;

if (
  !SQLSERVER_HOST ||
  !SQLSERVER_DB ||
  !SQLSERVER_USER ||
  !SQLSERVER_PASSWORD ||
  !MIGRATION_TENANT_ID
) {
  throw new Error(
    "Missing required env vars. Required: SQLSERVER_HOST, SQLSERVER_DB, SQLSERVER_USER, SQLSERVER_PASSWORD, MIGRATION_TENANT_ID"
  );
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

type SqlReportDetailRow = {
  legacy_id: number;
  report_definition_id: number;
  meas_point_id: number;
  detail_order_for_print: number | null;
  created_by: string | null;
  updated_by: string | null;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function loadJsonMap(fileName: string): Promise<Record<string, string>> {
  const fullPath = path.join(process.cwd(), "scripts", fileName);
  const raw = await fs.readFile(fullPath, "utf8");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  console.log("Connecting to SQL Server...");
  const pool = await sql.connect(mssqlConfig);

  console.log("Loading ID maps...");
  const reportIdMap = await loadJsonMap("report-id-map.json");
  const pointIdMap = await loadJsonMap("measurement-point-id-map.json");

  console.log("Reading common.report_definition_details from SQL Server...");
  const result = await pool.request().query<SqlReportDetailRow>(`
    SELECT
      id AS legacy_id,
      report_definition_id,
      meas_point_id,
      detail_order_for_print,
      created_by,
      updated_by
    FROM common.report_definition_details
    ORDER BY id
  `);

  const rows = result.recordset;
  console.log(`Found ${rows.length} report definition detail rows.`);

  console.log("Loading existing ReportMeasurementPoint rows from Neon...");
  const existing = await prisma.reportMeasurementPoint.findMany({
    where: { tenantId: MIGRATION_TENANT_ID },
    select: {
      id: true,
      reportDefinitionId: true,
      measurementPointId: true,
    },
  });

  const existingMap = new Map(
    existing.map((x) => [
      `${x.reportDefinitionId}|${x.measurementPointId}`,
      x.id,
    ])
  );

  const createRows: any[] = [];
  const updateRows: Array<{ id: string; data: any; legacyId: number }> = [];
  const skippedRows: Array<{ legacyId: number; reason: string }> = [];

  for (const row of rows) {
    const newReportId = reportIdMap[String(row.report_definition_id)];
    const newPointId = pointIdMap[String(row.meas_point_id)];

    if (!newReportId) {
      skippedRows.push({
        legacyId: row.legacy_id,
        reason: `ReportDefinition not mapped: legacy report_definition_id=${row.report_definition_id}`,
      });
      continue;
    }

    if (!newPointId) {
      skippedRows.push({
        legacyId: row.legacy_id,
        reason: `MeasurementPoint not mapped: legacy meas_point_id=${row.meas_point_id}`,
      });
      continue;
    }

    const key = `${newReportId}|${newPointId}`;

    const baseData = {
      tenantId: MIGRATION_TENANT_ID,
      reportDefinitionId: newReportId,
      measurementPointId: newPointId,
      sortOrder: row.detail_order_for_print ?? 100,
      isActive: true,
      createdBy: row.created_by || DEFAULT_CREATED_BY,
      updatedBy: row.updated_by || DEFAULT_CREATED_BY,
    };

    const existingId = existingMap.get(key);

    if (existingId) {
      updateRows.push({
        id: existingId,
        data: baseData,
        legacyId: row.legacy_id,
      });
    } else {
      createRows.push({
        ...baseData,
        legacyLegacyId: row.legacy_id,
      });
    }
  }

  console.log(
    `Prepared ${createRows.length} creates, ${updateRows.length} updates, ${skippedRows.length} skipped.`
  );

  const idMap: Record<string, string> = {};

  const createBatches = chunkArray(createRows, 1000);
  let created = 0;

  for (let i = 0; i < createBatches.length; i++) {
    const batch = createBatches[i].map(({ legacyLegacyId, ...rest }) => rest);

    await prisma.reportMeasurementPoint.createMany({
      data: batch,
      skipDuplicates: true,
    });

    created += batch.length;
    console.log(
      `Create batch ${i + 1}/${createBatches.length} done (${batch.length} rows).`
    );
  }

  const allAfterCreate = await prisma.reportMeasurementPoint.findMany({
    where: { tenantId: MIGRATION_TENANT_ID },
    select: {
      id: true,
      reportDefinitionId: true,
      measurementPointId: true,
    },
  });

  const allMap = new Map(
    allAfterCreate.map((x) => [
      `${x.reportDefinitionId}|${x.measurementPointId}`,
      x.id,
    ])
  );

  for (const row of createRows) {
    const key = `${row.reportDefinitionId}|${row.measurementPointId}`;
    const newId = allMap.get(key);
    if (newId) {
      idMap[String(row.legacyLegacyId)] = newId;
    }
  }

  let updated = 0;
  const updateBatches = chunkArray(updateRows, 200);

  for (let i = 0; i < updateBatches.length; i++) {
    const batch = updateBatches[i];

    await prisma.$transaction(
      batch.map((item) =>
        prisma.reportMeasurementPoint.update({
          where: { id: item.id },
          data: item.data,
          select: { id: true },
        })
      )
    );

    for (const item of batch) {
      idMap[String(item.legacyId)] = item.id;
    }

    updated += batch.length;
    console.log(
      `Update batch ${i + 1}/${updateBatches.length} done (${batch.length} rows).`
    );
  }

  const skipped = skippedRows.length;

  const outPath = path.join(
    process.cwd(),
    "scripts",
    "report-measurement-point-id-map.json"
  );
  await fs.writeFile(outPath, JSON.stringify(idMap, null, 2), "utf8");

  const skippedPath = path.join(
    process.cwd(),
    "scripts",
    "report-measurement-point-skipped.json"
  );
  await fs.writeFile(skippedPath, JSON.stringify(skippedRows, null, 2), "utf8");

  console.log("Done.");
  console.log({
    created,
    updated,
    skipped,
    idMapFile: outPath,
    skippedFile: skippedPath,
  });

  await pool.close();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});