import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "node:fs/promises";
import * as sql from "mssql";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const {
  SQLSERVER_HOST,
  SQLSERVER_DB,
  SQLSERVER_USER,
  SQLSERVER_PASSWORD,
  SQLSERVER_PORT,
  DEFAULT_CREATED_BY = "migration",
  MIGRATION_DATE_FROM,
  MIGRATION_DATE_TO,
} = process.env;

if (!SQLSERVER_HOST || !SQLSERVER_DB || !SQLSERVER_USER || !SQLSERVER_PASSWORD) {
  throw new Error(
    "Missing required env vars. Required: SQLSERVER_HOST, SQLSERVER_DB, SQLSERVER_USER, SQLSERVER_PASSWORD"
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

type SqlSnapshotDetailRow = {
  legacy_id: number;
  measurement_snapshot_id: number;
  snapshot_date: Date;
  measurement_point_id: number;
  mp_value: unknown;
  minus_1d_mp_value: unknown;
  created_by: string | null;
  updated_by: string | null;
};

function isIntegerLike(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value);
}

function mapVariant(value: unknown): {
  floatValue: number | null;
  intValue: number | null;
  textValue: string | null;
} {
  if (value === null || value === undefined) {
    return { floatValue: null, intValue: null, textValue: null };
  }

  if (typeof value === "number") {
    return {
      floatValue: value,
      intValue: isIntegerLike(value) ? value : null,
      textValue: null,
    };
  }

  if (typeof value === "bigint") {
    const n = Number(value);
    return {
      floatValue: n,
      intValue: Number.isInteger(n) ? n : null,
      textValue: null,
    };
  }

  if (typeof value === "boolean") {
    return {
      floatValue: value ? 1 : 0,
      intValue: value ? 1 : 0,
      textValue: null,
    };
  }

  if (typeof value === "string") {
    const t = value.trim();
    if (!t) {
      return { floatValue: null, intValue: null, textValue: null };
    }

    const n = Number(t.replace(",", "."));
    if (Number.isFinite(n)) {
      return {
        floatValue: n,
        intValue: Number.isInteger(n) ? n : null,
        textValue: t,
      };
    }

    return {
      floatValue: null,
      intValue: null,
      textValue: t,
    };
  }

  if (value instanceof Date) {
    return {
      floatValue: null,
      intValue: null,
      textValue: value.toISOString(),
    };
  }

  return {
    floatValue: null,
    intValue: null,
    textValue: JSON.stringify(value),
  };
}

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

function toDateOnlyLocal(value: Date | string): Date {
  const d = new Date(value);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function ymdLocal(value: Date | string): string {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function summarizeSkipped(
  skippedRows: Array<{ legacyId: number; reason: string }>
): Array<{ reason: string; count: number }> {
  const map = new Map<string, number>();

  for (const row of skippedRows) {
    map.set(row.reason, (map.get(row.reason) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

async function main() {
  console.log("process.cwd() =", process.cwd());
  console.log("Connecting to SQL Server...");
  const pool = await sql.connect(mssqlConfig);

  console.log("Loading id maps...");
  const pointIdMap = await loadJsonMap("measurement-point-id-map.json");
  const snapshotIdMap = await loadJsonMap("measurement-snapshot-id-map.json");

  const dateFilterSql =
    MIGRATION_DATE_FROM && MIGRATION_DATE_TO
      ? `WHERE d.snapshot_date >= '${MIGRATION_DATE_FROM}' AND d.snapshot_date <= '${MIGRATION_DATE_TO}'`
      : MIGRATION_DATE_FROM
      ? `WHERE d.snapshot_date >= '${MIGRATION_DATE_FROM}'`
      : MIGRATION_DATE_TO
      ? `WHERE d.snapshot_date <= '${MIGRATION_DATE_TO}'`
      : "";

  console.log(
    "Reading measurement_snapshot_details from SQL Server...",
    { MIGRATION_DATE_FROM, MIGRATION_DATE_TO }
  );

  const result = await pool.request().query<SqlSnapshotDetailRow>(`
    SELECT
      d.id AS legacy_id,
      d.measurement_snapshot_id,
      d.snapshot_date,
      d.measurement_point_id,
      d.mp_value,
      d.minus_1d_mp_value,
      d.created_by,
      d.updated_by
    FROM test_intex.measurement_snapshot_details d
    ${dateFilterSql}
    ORDER BY d.id
  `);

  const rows = result.recordset;
  console.log(`Found ${rows.length} measurement snapshot details.`);

  console.log("Loading existing snapshot details from Neon...");
  const existing = await prisma.measurementSnapshotDetail.findMany({
    select: {
      id: true,
      measurementSnapshotId: true,
      snapshotDate: true,
      measurementPointId: true,
    },
  });

  const existingMap = new Map(
    existing.map((x) => [
      `${x.measurementSnapshotId}|${ymdLocal(x.snapshotDate)}|${x.measurementPointId}`,
      x.id,
    ])
  );

  const createRows: Array<
    Prisma.MeasurementSnapshotDetailCreateManyInput & { legacyLegacyId: number }
  > = [];
  const updateRows: Array<{
    id: string;
    data: Prisma.MeasurementSnapshotDetailUpdateInput;
    legacyId: number;
  }> = [];
  const skippedRows: Array<{ legacyId: number; reason: string }> = [];

  for (const row of rows) {
    const newSnapshotId = snapshotIdMap[String(row.measurement_snapshot_id)];
    const newPointId = pointIdMap[String(row.measurement_point_id)];

    if (!newSnapshotId) {
      skippedRows.push({
        legacyId: row.legacy_id,
        reason: `Snapshot not mapped: legacy measurement_snapshot_id=${row.measurement_snapshot_id}`,
      });
      continue;
    }

    if (!newPointId) {
      skippedRows.push({
        legacyId: row.legacy_id,
        reason: `MeasurementPoint not mapped: legacy measurement_point_id=${row.measurement_point_id}`,
      });
      continue;
    }

    const mpValue = mapVariant(row.mp_value);
    const minus1dValue = mapVariant(row.minus_1d_mp_value);

    const snapshotDateOnly = toDateOnlyLocal(row.snapshot_date);
    const key = `${newSnapshotId}|${ymdLocal(snapshotDateOnly)}|${newPointId}`;

    const createData: Prisma.MeasurementSnapshotDetailCreateManyInput = {
      measurementSnapshotId: newSnapshotId,
      snapshotDate: snapshotDateOnly,
      measurementPointId: newPointId,

      mpValueFloat: mpValue.floatValue,
      mpValueInt: mpValue.intValue,
      mpValueText: mpValue.textValue,

      minus1dMpValueFloat: minus1dValue.floatValue,
      minus1dMpValueInt: minus1dValue.intValue,
      minus1dMpValueText: minus1dValue.textValue,

      createdBy: row.created_by || DEFAULT_CREATED_BY,
      updatedBy: row.updated_by || DEFAULT_CREATED_BY,
    };

    const updateData: Prisma.MeasurementSnapshotDetailUpdateInput = {
      snapshotDate: snapshotDateOnly,

      measurementPoint: {
        connect: {
          id: newPointId,
        },
      },

      mpValueFloat: mpValue.floatValue,
      mpValueInt: mpValue.intValue,
      mpValueText: mpValue.textValue,

      minus1dMpValueFloat: minus1dValue.floatValue,
      minus1dMpValueInt: minus1dValue.intValue,
      minus1dMpValueText: minus1dValue.textValue,

      createdBy: row.created_by || DEFAULT_CREATED_BY,
      updatedBy: row.updated_by || DEFAULT_CREATED_BY,
    };

    const existingId = existingMap.get(key);

    if (existingId) {
      updateRows.push({
        id: existingId,
        data: updateData,
        legacyId: row.legacy_id,
      });
    } else {
      createRows.push({
        ...createData,
        legacyLegacyId: row.legacy_id,
      });
    }
  }

  console.log(
    `Prepared ${createRows.length} creates, ${updateRows.length} updates, ${skippedRows.length} skipped.`
  );

  const skipSummary = summarizeSkipped(skippedRows);
  if (skipSummary.length > 0) {
    console.log("Top skip reasons:");
    console.table(skipSummary.slice(0, 20));
  }

  const idMap: Record<string, string> = {};

  const createBatches = chunkArray(createRows, 1000);
  let created = 0;

  for (let i = 0; i < createBatches.length; i++) {
    const batch: Prisma.MeasurementSnapshotDetailCreateManyInput[] = createBatches[
      i
    ].map(({ legacyLegacyId, ...rest }) => rest);

    await prisma.measurementSnapshotDetail.createMany({
      data: batch,
      skipDuplicates: true,
    });

    created += batch.length;
    console.log(
      `Create batch ${i + 1}/${createBatches.length} done (${batch.length} rows).`
    );
  }

  const allAfterCreate = await prisma.measurementSnapshotDetail.findMany({
    select: {
      id: true,
      measurementSnapshotId: true,
      snapshotDate: true,
      measurementPointId: true,
    },
  });

  const allMap = new Map(
    allAfterCreate.map((x) => [
      `${x.measurementSnapshotId}|${ymdLocal(x.snapshotDate)}|${x.measurementPointId}`,
      x.id,
    ])
  );

  for (const row of createRows) {
    const key = `${row.measurementSnapshotId}|${ymdLocal(
      row.snapshotDate as Date
    )}|${row.measurementPointId}`;
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
        prisma.measurementSnapshotDetail.update({
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
    "measurement-snapshot-detail-id-map.json"
  );
  const skippedPath = path.join(
    process.cwd(),
    "scripts",
    "measurement-snapshot-detail-skipped.json"
  );

  await fs.writeFile(outPath, JSON.stringify(idMap, null, 2), "utf8");
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