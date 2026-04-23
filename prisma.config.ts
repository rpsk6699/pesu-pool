import { defineConfig } from "@prisma/config";
import { config } from "dotenv";

// Force the CLI to read your Next.js environment files
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: (process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL) as string,
  },
});