import type { Config } from "drizzle-kit";

console.log("DATABASE_URL:", process.env.DATABASE_URL);
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  entities: {
    roles: {
      provider: "supabase",
    },
  },
} satisfies Config;
