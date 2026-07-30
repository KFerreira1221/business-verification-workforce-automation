const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction
        ? {
            rejectUnauthorized: false,
          }
        : false,
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "business_verification",
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
      ssl: false,
    };

const pool = new Pool(poolConfig);

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected PostgreSQL error:", err);
});

async function logDatabaseConnection() {
  try {
    const databaseInfo = await pool.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        inet_server_addr() AS database_host,
        inet_server_port() AS database_port
    `);

    console.log("📦 Active PostgreSQL database:", databaseInfo.rows[0]);

    const businessCount = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM businesses
    `);

    console.log(
      "🏢 Businesses in active database:",
      businessCount.rows[0].count
    );

    const verificationCount = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM verification_results
    `);

    console.log(
      "🔍 Verification results in active database:",
      verificationCount.rows[0].count
    );
  } catch (error) {
    console.error(
      "❌ Could not inspect active PostgreSQL database:",
      error.message
    );
  }
}

logDatabaseConnection();

module.exports = pool;
