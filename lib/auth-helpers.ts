import { auth } from '../auth'
import { prisma } from './prisma'

export class AuthError extends Error {
  status: 401 | 403 | 404

  constructor(message: string, status: 401 | 403 | 404 = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export async function requireSessionUser(): Promise<{ email: string; name: string }> {
  const session = await auth()
  const email = session?.user?.email
  const name = session?.user?.name

  if (!email) {
    throw new AuthError('Unauthorized', 401)
  }

  return {
    email,
    name: name ?? 'PESU Student',
  }
}

export async function getOrCreateUser(email: string, name: string) {
  return prisma.user.upsert({
    where: { email },
    update: { name },
    create: { name, email },
  })
}

export async function assertPoolMember(poolId: string, email: string) {
  const pool = await prisma.pool.findFirst({
    where: {
      id: poolId,
      OR: [
        { creator: { email } },
        { participants: { some: { email } } },
      ],
    },
    include: {
      creator: { select: { email: true } },
    },
  })

  if (!pool) {
    throw new AuthError('Forbidden: not a member of this pool', 403)
  }

  return pool
}

export async function assertPoolCreator(poolId: string, email: string) {
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
      creator: { select: { email: true } },
    },
  })

  if (!pool) {
    throw new AuthError('Pool not found', 404)
  }

  if (pool.creator.email !== email) {
    throw new AuthError('Forbidden: only the pool creator can perform this action', 403)
  }

  return pool
}
