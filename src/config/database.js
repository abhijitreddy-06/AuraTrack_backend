import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const connectionUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const usesSupabase = Boolean(process.env.SUPABASE_DB_URL);
const shouldUseSsl = usesSupabase || process.env.DB_SSL === "true";

if (
  usesSupabase &&
  connectionUrl.includes(".supabase.co") &&
  !connectionUrl.includes(".pooler.supabase.com")
) {
  console.warn(
    "SUPABASE_DB_URL uses Supabase's direct host. On an IPv4-only deployment host, use the Session Pooler URL from Supabase Connect instead.",
  );
}

const databaseOptions = {
  dialect: "postgres",
  timezone: "+05:30",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
  ...(shouldUseSsl
    ? {
        dialectOptions: {
          ssl: { require: true, rejectUnauthorized: false },
        },
      }
    : {}),
};

const sequelize = connectionUrl
  ? new Sequelize(connectionUrl, databaseOptions)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USERNAME,
      process.env.DB_PASSWORD,
      {
        ...databaseOptions,
        host: process.env.DB_HOST,
      },
    );

export default sequelize;
