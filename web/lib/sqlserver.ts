// lib/sqlserver.ts
import sql from "mssql";

const globalForSql = global as unknown as {
  sqlPool: sql.ConnectionPool | null;
};

export async function getSqlPool() {
  if (!globalForSql.sqlPool) {
    globalForSql.sqlPool = await new sql.ConnectionPool({
      user: process.env.SQLSERVER_USER,
      password: process.env.SQLSERVER_PASSWORD,
      server: process.env.SQLSERVER_HOST || "",
      database: process.env.SQLSERVER_DB,
      options: {
        trustServerCertificate: true,
        encrypt: false,
      },
    }).connect();
  }

  return globalForSql.sqlPool;
}