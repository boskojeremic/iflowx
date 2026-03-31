import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import sql from "mssql";
import { Client } from "pg";

type MpMap = Record<string, string>;

type SqlRow = {
  legacy_mp_id: number;
  measure_dt: Date | null;
  m_value: unknown;
};

type NeonScadaRow = {
  id: string;
};

const MP_CHUNK_SIZE = 200;

const SQL_CONFIG: sql.config = {
  server: process.env.SQLSERVER_HOST!,
  port: Number(process.env.SQLSERVER_PORT || 1433),
  user: process.env.SQLSERVER_USER!,
  password: process.env.SQLSERVER_PASSWORD!,
  database: process.env.SQLSERVER_DATABASE || process.env.SQLSERVER_DB!,
  requestTimeout: 300000,
  connectionTimeout: 60000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const NEON_CONNECTION_STRING = process.env.DATABASE_URL!;
const TENANT_ID = process.env.MIGRATION_TENANT_ID!;
const DATE_TO = process.env.MIGRATION_DATE_TO!;

const MAP_FILE = path.resolve(
  process.cwd(),
  "scripts/measurement-point-id-map.json"
);

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function loadMap(): Promise<MpMap> {
  const raw = await fs.readFile(MAP_FILE, "utf8");
  return JSON.parse(raw);
}

function nextDayStart(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d;
}

function normalizeMValue(input: unknown): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}

async function main() {
  console.log("===== START =====");

  const mpMap = await loadMap();

  const neon = new Client({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  await neon.connect();

  let pool: sql.ConnectionPool | null = null;

  try {
    // 🔥 1. UZMI SAMO SCADA TAGOVE
    const scadaRes = await neon.query<NeonScadaRow>(`
      SELECT mp.id
      FROM measurement_points mp
      JOIN mp_sources s ON mp."mpSourceId" = s.id
      WHERE UPPER(s."sourceName") = 'SCADA'
    `);

    const scadaSet = new Set(scadaRes.rows.map((r) => r.id));

    const legacyIds = Object.entries(mpMap)
      .filter(([, mpId]) => scadaSet.has(mpId))
      .map(([legacyId]) => Number(legacyId));

    console.log(`SCADA MPs: ${legacyIds.length}`);

    // 🔥 cutoff datum
    const cutoff = nextDayStart(DATE_TO);

    console.log("Connecting to SQL Server...");
    pool = await sql.connect(SQL_CONFIG);

    const idChunks = chunkArray(legacyIds, MP_CHUNK_SIZE);

    let totalUpserted = 0;

    for (let c = 0; c < idChunks.length; c++) {
      const ids = idChunks[c];

      console.log(`Chunk ${c + 1}/${idChunks.length}`);

      const request = pool.request();

      ids.forEach((id, i) => {
        request.input(`id${i}`, sql.Int, id);
      });

      request.input("cutoff", sql.DateTime, cutoff);

      const inClause = ids.map((_, i) => `@id${i}`).join(",");

      const query = `
        SELECT
          mp.id AS legacy_mp_id,
          m.measure_dt,
          m.m_value
        FROM common.measurement_points mp
        OUTER APPLY (
          SELECT TOP (1)
            measure_dt,
            m_value
          FROM [ars_intex].[intex_auto].[measurements] m
          WHERE m.measurement_point_id = mp.id
            AND m.measure_dt < @cutoff
          ORDER BY m.measure_dt DESC
        ) m
        WHERE mp.id IN (${inClause})
      `;

      const result = await request.query<SqlRow>(query);
      const rows = result.recordset ?? [];

      const valuesSql: string[] = [];
      const params: unknown[] = [];

      for (const row of rows) {
        const mpId = mpMap[String(row.legacy_mp_id)];
        if (!mpId) continue;

        let measureDt = row.measure_dt;
        let value = normalizeMValue(row.m_value);

        // 🔥 AKO NEMA VREDNOSTI → FORSIRAJ 0 I CUT-OFF DATUM
        if (!measureDt) {
          measureDt = cutoff;
          value = 0;
        }

        if (value === null) {
          value = 0;
        }

        valuesSql.push(
          `(
            gen_random_uuid(),
            $${params.length + 1},
            $${params.length + 2},
            $${params.length + 3},
            $${params.length + 4},
            $${params.length + 5}
          )`
        );

        params.push(
          TENANT_ID,
          mpId,
          row.legacy_mp_id,
          measureDt,
          value
        );
      }

      if (!valuesSql.length) continue;

      await neon.query(
        `
        INSERT INTO scada_measurements (
          id,
          tenant_id,
          measurement_point_id,
          legacy_mp_id,
          measure_dt,
          m_value
        )
        VALUES ${valuesSql.join(",")}
        ON CONFLICT (tenant_id, measurement_point_id, measure_dt)
        DO UPDATE SET
          m_value = EXCLUDED.m_value
        `,
        params
      );

      totalUpserted += valuesSql.length;
      console.log(`  upserted: ${valuesSql.length}`);
    }

    console.log("===== DONE =====");
    console.log("Total upserted:", totalUpserted);
  } finally {
    if (pool) await pool.close();
    await neon.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});