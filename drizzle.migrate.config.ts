import { defineConfig } from "drizzle-kit";

/** Production container migrate — schema TS not shipped; SQL journal only. */
export default defineConfig({
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://unionops:unionops@localhost:5432/unionops",
  },
});
