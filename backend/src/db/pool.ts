import { Pool } from "pg";
import { config } from "../config";

export const pool = new Pool({
  connectionString: config.databaseUrl,
});
console.log("this is Pool   ,", pool);
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});
