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

type SqlSnapshotRow = {
  legacy_id: number;
  snapshot_date: Date;
  report_id: number;
  snapshot_revision_no: number | null;
  snapshot_number: number | null;
  document_number: string | null;
  snap_comment: string | null;
  responsible_id: number | null;
  approver_id: number | null;
  contributer_id: number | null;
  informer_id: number | null;
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

  console.log("Loading report id map...");
  const reportIdMap = await loadJsonMap("report-id-map.json");

  console.log("Reading measurement_snapshots from SQL Server...");
  const result = await pool.request().query<SqlSnapshotRow>(`
    SELECT
      ms.id AS legacy_id,
      ms.snapshot_date,
      ms.report_id,
      ms.snapshot_revision_no,
      ms.snapshot_number,
      ms.document_number,
      ms.snap_comment,
      ms.responsible_id,
      ms.approver_id,
      ms.contributer_id,
      ms.informer_id,
      ms.created_by,
      ms.updated_by
    FROM test_intex.measurement_snapshots ms
    ORDER BY ms.id
  `);

  const rows = result.recordset;
  console.log(`Found ${rows.length} measurement snapshots.`);

  console.log("Loading existing snapshots from Neon...");
  const existing = await prisma.measurementSnapshot.findMany({
    where: { tenantId: MIGRATION_TENANT_ID },
    select: {
      id: true,
      reportId: true,
      snapshotDate: true,
      snapshotRevisionNo: true,
    },
  });

  const existingMap = new Map(
    existing.map((x) => [
      `${x.reportId}|${x.snapshotDate.toISOString().slice(0, 10)}|${x.snapshotRevisionNo ?? "null"}`,
      x.id,
    ])
  );

  const createRows: any[] = [];
  const updateRows: Array<{ id: string; data: any; legacyId: number }> = [];
  const skippedRows: Array<{ legacyId: number; reason: string }> = [];

  for (const row of rows) {
    const newReportId = reportIdMap[String(row.report_id)];

    if (!newReportId) {
      skippedRows.push({
        legacyId: row.legacy_id,
        reason: `Report not mapped: legacy report_id=${row.report_id}`,
      });
      continue;
    }

    const snapshotDateOnly = new Date(row.snapshot_date);
    const key = `${newReportId}|${snapshotDateOnly.toISOString().slice(0, 10)}|${row.snapshot_revision_no ?? "null"}`;

    const baseData = {
      tenantId: MIGRATION_TENANT_ID,
      snapshotDate: snapshotDateOnly,
      reportId: newReportId,
      snapshotRevisionNo: row.snapshot_revision_no,
      snapshotNumber: row.snapshot_number,
      documentNumber: row.document_number,
      snapComment: row.snap_comment,

      responsibleUserId: null,
      approverUserId: null,
      contributorUserId: null,
      informerUserId: null,

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

  const createBatches = chunkArray(createRows, 500);
  let created = 0;

  for (let i = 0; i < createBatches.length; i++) {
    const batch = createBatches[i].map(({ legacyLegacyId, ...rest }) => rest);

    await prisma.measurementSnapshot.createMany({
      data: batch,
      skipDuplicates: true,
    });

    created += batch.length;
    console.log(
      `Create batch ${i + 1}/${createBatches.length} done (${batch.length} rows).`
    );
  }

  const allAfterCreate = await prisma.measurementSnapshot.findMany({
    where: { tenantId: MIGRATION_TENANT_ID },
    select: {
      id: true,
      reportId: true,
      snapshotDate: true,
      snapshotRevisionNo: true,
    },
  });

  const allMap = new Map(
    allAfterCreate.map((x) => [
      `${x.reportId}|${x.snapshotDate.toISOString().slice(0, 10)}|${x.snapshotRevisionNo ?? "null"}`,
      x.id,
    ])
  );

  for (const row of createRows) {
    const key = `${row.reportId}|${new Date(row.snapshotDate).toISOString().slice(0, 10)}|${row.snapshotRevisionNo ?? "null"}`;
    const newId = allMap.get(key);
    if (newId) {
      idMap[String(row.legacyLegacyId)] = newId;
    }
  }

  let updated = 0;
  const updateBatches = chunkArray(updateRows, 100);

  for (let i = 0; i < updateBatches.length; i++) {
    const batch = updateBatches[i];

    await prisma.$transaction(
      batch.map((item) =>
        prisma.measurementSnapshot.update({
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
    "measurement-snapshot-id-map.json"
  );
  await fs.writeFile(outPath, JSON.stringify(idMap, null, 2), "utf8");

  const skippedPath = path.join(
    process.cwd(),
    "scripts",
    "measurement-snapshot-skipped.json"
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