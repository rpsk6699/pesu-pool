'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '../../lib/prisma'
import {
  requireSessionUser,
  getOrCreateUser,
  assertPoolCreator,
} from '../../lib/auth-helpers'
import { pusher } from '../lib/pusher'
import { GLOBAL_POOLS_CHANNEL, poolChannel } from '../../lib/pusher-channels'

function combineTodayWithTime(time: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  const parts = formatter.formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value

  const exactIstTime = `${year}-${month}-${day}T${time}:00+05:30`
  const d = new Date(exactIstTime)
  
  if (d.getTime() < Date.now() - 60 * 60 * 1000) {
    d.setDate(d.getDate() + 1)
  }
  
  return d
}

export async function createPool(formData: FormData) {
  const routeFrom = String(formData.get('routeFrom') ?? '').trim()
  const routeTo = String(formData.get('routeTo') ?? '').trim()
  const leavingTime = String(formData.get('leavingTime') ?? '').trim()
  const spotsTotal = Number.parseInt(String(formData.get('spotsTotal') ?? '2'), 10)

  if (!routeFrom || !routeTo) throw new Error('Missing route')
  if (!Number.isFinite(spotsTotal) || spotsTotal < 1 || spotsTotal > 3) throw new Error('Invalid spots')

  const leavingAt = leavingTime ? combineTodayWithTime(leavingTime) : new Date()

  const { email, name } = await requireSessionUser()
  const user = await getOrCreateUser(email, name)

  // --- UPGRADED BACKEND BOUNCER (CREATE) ---
  // Blocks creating a pool if they are a driver OR a passenger in an active one
  const existingActivePool = await prisma.pool.findFirst({
    where: {
      status: { in: ['ACTIVE', 'FULL'] },
      OR: [
        { creatorId: user.id },
        { participants: { some: { id: user.id } } }
      ]
    },
  })

  if (existingActivePool) {
    throw new Error('You are already part of an active pool. Leave or complete it first.')
  }
  // -----------------------------------------

  await prisma.pool.create({
    data: {
      creatorId: user.id,
      routeFrom,
      routeTo,
      spotsTotal,
      spotsLeft: spotsTotal,
      leavingAt,
      status: 'ACTIVE',
    },
  })

  await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  revalidatePath('/')
}

export async function deletePool(poolId: string) {
  if (!poolId) throw new Error('Missing poolId')

  const { email } = await requireSessionUser()
  await assertPoolCreator(poolId, email)

  await prisma.pool.delete({
    where: { id: poolId },
  })
  await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  revalidatePath('/')
  revalidatePath('/rides')
}

export async function joinPool(poolId: string) {
  if (!poolId) return

  const { email, name } = await requireSessionUser()
  const user = await getOrCreateUser(email, name)

  // --- UPGRADED BACKEND BOUNCER (JOIN) ---
  const existingActivePool = await prisma.pool.findFirst({
    where: {
      status: { in: ['ACTIVE', 'FULL'] },
      OR: [
        { creatorId: user.id },
        { participants: { some: { id: user.id } } }
      ]
    },
  })

  if (existingActivePool) {
    // Silently fail so they can't join a second pool
    return 
  }
  // ---------------------------------------

  const joined = await prisma.$transaction(async (tx) => {
    const pool = await tx.pool.findUnique({
      where: { id: poolId },
      include: { participants: true },
    })

    if (!pool || pool.spotsLeft <= 0) {
      return false
    }

    if (pool.participants.some((p) => p.id === user.id)) {
      return false
    }

    const decrementResult = await tx.pool.updateMany({
      where: {
        id: poolId,
        spotsLeft: { gt: 0 },
        status: { in: ['ACTIVE', 'FULL'] },
      },
      data: {
        spotsLeft: { decrement: 1 },
      },
    })

    if (decrementResult.count !== 1) {
      return false
    }

    const newSpotsLeft = pool.spotsLeft - 1

    await tx.pool.update({
      where: { id: poolId },
      data: {
        status: newSpotsLeft === 0 ? 'FULL' : pool.status,
        participants: {
          connect: { id: user.id },
        },
      },
    })

    return true
  })

  if (!joined) {
    await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
    revalidatePath('/')
    return
  }

  // --- WHATSAPP STYLE JOIN MESSAGE ---
  try {
    const systemUser = await prisma.user.upsert({
      where: { email: 'system@app.local' },
      update: {},
      create: { name: 'System', email: 'system@app.local' },
    })

    await prisma.message.create({
      data: {
        poolId: poolId,
        senderId: systemUser.id, 
        text: `${name} joined the pool! 👋`,
      }
    })
    await pusher.trigger(poolChannel(poolId), 'new-message', {})
  } catch (error) {
    console.error("Failed to send join message:", error)
  }
  // ----------------------------------------

  await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  revalidatePath('/')
}

export async function leavePool(poolId: string) {
  if (!poolId) return

  const { email, name } = await requireSessionUser()
  const user = await getOrCreateUser(email, name)

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { participants: true },
  })

  if (!pool) return

  const isParticipant = pool.participants.some((p: { id: string }) => p.id === user.id)
  if (!isParticipant) return

  const newSpotsLeft = pool.spotsLeft + 1
  await prisma.pool.update({
    where: { id: poolId },
    data: {
      spotsLeft: newSpotsLeft,
      status: pool.status === 'FULL' ? 'ACTIVE' : pool.status,
      participants: {
        disconnect: { id: user.id }, 
      },
    },
  })

  await pusher.trigger(poolChannel(poolId), 'user-left', { userId: user.id, name })

  // --- WHATSAPP STYLE LEAVE MESSAGE ---
  try {
    const systemUser = await prisma.user.upsert({
      where: { email: 'system@app.local' },
      update: {},
      create: { name: 'System', email: 'system@app.local' },
    })

    await prisma.message.create({
      data: {
        poolId: poolId,
        senderId: systemUser.id, 
        text: `${name} left the pool. 🚪`,
      }
    })
    await pusher.trigger(poolChannel(poolId), 'new-message', {})
  } catch (error) {
    console.error("Failed to send leave message:", error)
  }
  // -----------------------------------------

  await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  revalidatePath('/')
  revalidatePath('/rides')
}

export async function closePool(poolId: string) {
  if (!poolId) throw new Error('Missing poolId')

  const { email } = await requireSessionUser()
  await assertPoolCreator(poolId, email)

  await prisma.pool.update({
    where: { id: poolId },
    data: { status: 'COMPLETED' },
  })

  await prisma.message.deleteMany({
    where: { poolId: poolId },
  })

  await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  revalidatePath('/')
}

export async function sweepStalePools() {
  // Calculate the time 2 hours ago from right now
  const expirationTime = new Date(Date.now() - 2 * 60 * 60 * 1000)

  // 1. Find the stale pools that users forgot to close
  const stalePools = await prisma.pool.findMany({
    where: {
      leavingAt: { lt: expirationTime },
      status: { not: 'COMPLETED' }, 
    },
    select: { id: true }
  })

  if (stalePools.length > 0) {
    const staleIds = stalePools.map(p => p.id)

    // 2. Erase all chats for these forgotten pools to protect privacy
    await prisma.message.deleteMany({
      where: { 
        poolId: { in: staleIds } 
      }
    })

    // 3. Mark them as COMPLETED so users keep their ride history
    await prisma.pool.updateMany({
      where: { 
        id: { in: staleIds } 
      },
      data: { status: 'COMPLETED' }
    })
  }
}

export async function completePool(poolId: string) {
  if (!poolId) throw new Error('Missing poolId')

  const { email } = await requireSessionUser()
  await assertPoolCreator(poolId, email)
  
  await prisma.pool.update({
    where: { id: poolId },
    data: { status: 'COMPLETED' },
  })
  
  await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  
  revalidatePath('/')
  revalidatePath('/rides')
}

export async function autoCancelEmptyPools() {
  const gracePeriodTime = new Date(Date.now() - 15 * 60 * 1000)

  const expiredEmptyPools = await prisma.pool.findMany({
    where: {
      leavingAt: { lt: gracePeriodTime },
      status: 'ACTIVE',
      participants: { none: {} } 
    },
    select: { id: true }
  })

  if (expiredEmptyPools.length > 0) {
    const idsToDelete = expiredEmptyPools.map(pool => pool.id)

    await prisma.pool.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    })

    await pusher.trigger(GLOBAL_POOLS_CHANNEL, 'pools-updated', {})
  }
}
