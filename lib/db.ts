import mysql from "mysql2/promise";

declare global {
  // eslint-disable-next-line no-var
  var __yzPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!global.__yzPool) {
    global.__yzPool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "yuezi",
      password: process.env.DB_PASSWORD || "yuezi123",
      database: process.env.DB_NAME || "yuezi_center",
      connectionLimit: 10,
      dateStrings: true,
      namedPlaceholders: false,
    });
  }
  return global.__yzPool;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await getPool().query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length ? rows[0] : null;
}

export async function exec(sql: string, params: any[] = []): Promise<{ insertId: number; affectedRows: number }> {
  const [res] = await getPool().execute(sql, params);
  const r = res as mysql.ResultSetHeader;
  return { insertId: r.insertId, affectedRows: r.affectedRows };
}
