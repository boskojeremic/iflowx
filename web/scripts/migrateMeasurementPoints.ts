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

type SqlMpRow = {
  legacy_id: number;
  tag_no: string;
  mp_source_id: number | null;
  source_name: string | null;
  desc_en: string | null;
  desc_ru: string | null;

  field_system_id: number | null;
  field_subsystem_id: number | null;
  field_unit_id: number | null;
  field_equipment_id: number | null;

  proc_inst_diag_name: string | null;
  io_list_tag: string | null;
  source_tag: string | null;
  controller_prim_tag: string | null;
  controller_sec_tag: string | null;
  consumer_tag: string | null;
  comm_module_prim_address: string | null;
  comm_module_sec_address: string | null;
  rack: string | null;
  slot: string | null;
  channel: string | null;
  signal_type: string | null;
  hmi_associated_display: string | null;

  measurement_unit_id: number | null;
  unit_title: string | null;

  storage_movement_id: number | null;
  storage_movement_name: string | null;

  mp_data_type_id: number | null;
  data_type_name: string | null;

  measurement_variable_id: number | null;
  variable_name: string | null;

  last_value: unknown;
  minimum_eu: unknown;
  maximum_eu: unknown;
  low_value: unknown;
  high_value: unknown;
  low_low_value: unknown;
  high_high_value: unknown;

  mp_tag_type_id: number | null;
  tag_type_name: string | null;

  well_definition_id: number | null;
  reservoir_id: number | null;
  have_default: boolean | null;
  longitude: unknown;
  latitude: unknown;
  sensor_is_off: boolean | null;

  created_by: string | null;
  updated_by: string | null;
};

function isIntegerLike(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value);
}

function toFloatOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const t = value.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (value instanceof Date) return value.getTime();
  return null;
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
    if (!t) return { floatValue: null, intValue: null, textValue: null };
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

function chunkArray<T>(arr: T[], size: number): T[][];
function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function main() {
  console.log("Connecting to SQL Server...");
  const pool = await sql.connect(mssqlConfig);

  console.log("Loading lookup tables from Neon...");
  const [sources, units, dataTypes, tagTypes, variables, storageMovements] =
    await Promise.all([
      prisma.mpSource.findMany(),
      prisma.measurementUnit.findMany(),
      prisma.mpDataType.findMany(),
      prisma.mpTagType.findMany(),
      prisma.measurementVariable.findMany(),
      prisma.storageMovement.findMany(),
    ]);

  const sourceMap = new Map(sources.map((x) => [x.sourceName, x.id]));
  const unitMap = new Map(units.map((x) => [x.unitTitle, x.id]));
  const dataTypeMap = new Map(dataTypes.map((x) => [x.dataTypeName, x.id]));
  const tagTypeMap = new Map(
    tagTypes
      .filter((x) => x.tagTypeName)
      .map((x) => [x.tagTypeName as string, x.id])
  );
  const variableMap = new Map(variables.map((x) => [x.variableName, x.id]));
  const storageMovementMap = new Map(
    storageMovements.map((x) => [x.storageMovementName, x.id])
  );

  console.log("Reading measurement_points from SQL Server...");
  const result = await pool.request().query<SqlMpRow>(`
    SELECT
      mp.id AS legacy_id,
      mp.tag_no,
      mp.mp_source_id,
      src.source_name,
      mp.desc_en,
      mp.desc_ru,

      mp.field_system_id,
      mp.field_subsystem_id,
      mp.field_unit_id,
      mp.field_equipment_id,

      mp.proc_inst_diag_name,
      mp.io_list_tag,
      mp.source_tag,
      mp.controller_prim_tag,
      mp.controller_sec_tag,
      mp.consumer_tag,
      mp.comm_module_prim_address,
      mp.comm_module_sec_address,
      mp.rack,
      mp.slot,
      mp.channel,
      mp.signal_type,
      mp.hmi_associated_display,

      mp.measurement_unit_id,
      mu.unit_title,

      mp.storage_movement_id,
      sm.storage_movement_name,

      mp.mp_data_type_id,
      dt.data_type_name,

      mp.measurement_variable_id,
      mv.variable_name,

      mp.last_value,
      mp.minimum_eu,
      mp.maximum_eu,
      mp.low_value,
      mp.high_value,
      mp.low_low_value,
      mp.high_high_value,

      mp.mp_tag_type_id,
      tt.tag_type_name,

      mp.well_definition_id,
      mp.reservoir_id,
      mp.have_default,
      mp.longitude,
      mp.latitude,
      mp.sensor_is_off,
      mp.created_by,
      mp.updated_by
    FROM common.measurement_points mp
    LEFT JOIN common.mp_sources src
      ON src.id = mp.mp_source_id
    LEFT JOIN common.measurement_units mu
      ON mu.id = mp.measurement_unit_id
    LEFT JOIN common.storage_movements sm
      ON sm.id = mp.storage_movement_id
    LEFT JOIN common.mp_data_types dt
      ON dt.id = mp.mp_data_type_id
    LEFT JOIN common.measurement_variables mv
      ON mv.id = mp.measurement_variable_id
    LEFT JOIN common.mp_tag_types tt
      ON tt.id = mp.mp_tag_type_id
    ORDER BY mp.id
  `);

  const rows = result.recordset;
  console.log(`Found ${rows.length} measurement points.`);

  console.log("Loading existing measurement points from Neon...");
  const existingPoints = await prisma.measurementPoint.findMany({
    where: { tenantId: MIGRATION_TENANT_ID! },
    select: { id: true, tagNo: true },
  });
  const existingByTag = new Map(existingPoints.map((x) => [x.tagNo, x.id]));

  const createRows: any[] = [];
  const updateRows: Array<{ id: string; data: any; legacyId: number }> = [];
  const skippedRows: Array<{ legacyId: number; tagNo: string; reason: string }> =
    [];

  for (const row of rows) {
    const mpSourceId = row.source_name
      ? sourceMap.get(row.source_name) ?? null
      : null;

    const measurementUnitId = row.unit_title
      ? unitMap.get(row.unit_title) ?? null
      : null;

    const mpDataTypeId = row.data_type_name
      ? dataTypeMap.get(row.data_type_name) ?? null
      : null;

    const mpTagTypeId =
      row.tag_type_name && tagTypeMap.has(row.tag_type_name)
        ? tagTypeMap.get(row.tag_type_name) ?? null
        : null;

    const measurementVariableId = row.variable_name
      ? variableMap.get(row.variable_name) ?? null
      : null;

    const storageMovementId = row.storage_movement_name
      ? storageMovementMap.get(row.storage_movement_name) ?? null
      : null;

    if (!mpSourceId) {
      skippedRows.push({
        legacyId: row.legacy_id,
        tagNo: row.tag_no,
        reason: `Source not mapped: ${row.source_name}`,
      });
      continue;
    }

    const lastValue = mapVariant(row.last_value);

    const baseData = {
      tenantId: MIGRATION_TENANT_ID!,
      tagNo: row.tag_no,
      createdBy: row.created_by || DEFAULT_CREATED_BY,
      updatedBy: row.updated_by || DEFAULT_CREATED_BY,

      mpSourceId,
      measurementUnitId,
      storageMovementId,
      mpDataTypeId,
      measurementVariableId,
      mpTagTypeId,

      descEn: row.desc_en,
      descRu: row.desc_ru,

      procInstDiagName: row.proc_inst_diag_name,
      ioListTag: row.io_list_tag,
      sourceTag: row.source_tag,
      controllerPrimTag: row.controller_prim_tag,
      controllerSecTag: row.controller_sec_tag,
      consumerTag: row.consumer_tag,
      commModulePrimAddress: row.comm_module_prim_address,
      commModuleSecAddress: row.comm_module_sec_address,
      rack: row.rack,
      slot: row.slot,
      channel: row.channel,
      signalType: row.signal_type,
      hmiAssociatedDisplay: row.hmi_associated_display,

      lastValueFloat: lastValue.floatValue,
      lastValueInt: lastValue.intValue,
      lastValueText: lastValue.textValue,

      minimumEu: toFloatOrNull(row.minimum_eu),
      maximumEu: toFloatOrNull(row.maximum_eu),
      lowValue: toFloatOrNull(row.low_value),
      highValue: toFloatOrNull(row.high_value),
      lowLowValue: toFloatOrNull(row.low_low_value),
      highHighValue: toFloatOrNull(row.high_high_value),

      wellDefinitionId: row.well_definition_id,
      reservoirId: row.reservoir_id,
      haveDefault: row.have_default ?? false,
      longitude: toFloatOrNull(row.longitude),
      latitude: toFloatOrNull(row.latitude),
      sensorIsOff: row.sensor_is_off ?? false,
      isActive: true,

      facilityId: null,
      assetId: null,
    };

    const existingId = existingByTag.get(row.tag_no);

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

  // CREATE MANY IN BATCHES
  const createBatches = chunkArray(createRows, 500);
  let created = 0;

  for (let i = 0; i < createBatches.length; i++) {
    const batch = createBatches[i].map(({ legacyLegacyId, ...rest }) => rest);

    await prisma.measurementPoint.createMany({
      data: batch,
      skipDuplicates: true,
    });

    created += batch.length;
    console.log(`Create batch ${i + 1}/${createBatches.length} done (${batch.length} rows).`);
  }

  // RELOAD CREATED/ALL IDS FOR MAPPING
  const allPointsAfterCreate = await prisma.measurementPoint.findMany({
    where: { tenantId: MIGRATION_TENANT_ID! },
    select: { id: true, tagNo: true },
  });
  const allByTag = new Map(allPointsAfterCreate.map((x) => [x.tagNo, x.id]));

  for (const row of createRows) {
    const newId = allByTag.get(row.tagNo);
    if (newId) {
      idMap[String(row.legacyLegacyId)] = newId;
    }
  }

  // UPDATES
  let updated = 0;
  const updateBatches = chunkArray(updateRows, 100);

  for (let i = 0; i < updateBatches.length; i++) {
    const batch = updateBatches[i];

    await prisma.$transaction(
      batch.map((item) =>
        prisma.measurementPoint.update({
          where: { id: item.id },
          data: item.data,
          select: { id: true, tagNo: true },
        })
      )
    );

    for (const item of batch) {
      idMap[String(item.legacyId)] = item.id;
    }

    updated += batch.length;
    console.log(`Update batch ${i + 1}/${updateBatches.length} done (${batch.length} rows).`);
  }

  const skipped = skippedRows.length;

  const outPath = path.join(
    process.cwd(),
    "scripts",
    "measurement-point-id-map.json"
  );
  await fs.writeFile(outPath, JSON.stringify(idMap, null, 2), "utf8");

  const skippedPath = path.join(
    process.cwd(),
    "scripts",
    "measurement-point-skipped.json"
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