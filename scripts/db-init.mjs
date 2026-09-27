// 初始化数据库：读取 db/schema.sql 与 db/seed.sql 并执行
// 用法：node scripts/db-init.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "yuezi",
  password: process.env.DB_PASSWORD || "yuezi123",
  database: process.env.DB_NAME || "yuezi_center",
  multipleStatements: true,
});

for (const f of ["schema.sql", "seed.sql"]) {
  const sql = fs.readFileSync(path.join(root, "db", f), "utf8");
  console.log(`>> executing db/${f}`);
  await conn.query(sql);
}
console.log("数据库初始化完成：schema + 演示数据已就绪。");
await conn.end();
