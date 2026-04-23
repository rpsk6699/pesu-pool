import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 1. Fail fast if the environment variable is missing entirely
if (!process.env.POSTGRES_PRISMA_URL) {
  throw new Error("Missing POSTGRES_PRISMA_URL in environment variables!");
}

// 2. Create the raw Postgres pool using the URL AND the SSL flag
const pool = new Pool({ 
  connectionString: process.env.POSTGRES_PRISMA_URL,
  ssl: { rejectUnauthorized: false }
})

// 3. Feed the correctly configured pool into the adapter
const adapter = new PrismaPg(pool)

// 4. Start the client
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma