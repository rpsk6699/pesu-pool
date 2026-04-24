'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '../../lib/prisma'
import { auth } from '../../auth'
import Pusher from 'pusher'

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
})

const TEST_USER = {
  name: 'Arjun R.',
  email: 'arjun.test@pes.edu',
}

function combineTodayWithTime(time: string) {
  const now = new Date()
  const [hh, mm] = time.split(':').map((x) => Number.parseInt(x, 10))
  const d = new Date(now)
  d.setSeconds(0, 0)
  d.setHours(Number.isFinite(hh) ? hh : now.getHours(), Number.isFinite(mm) ? mm : now.getMinutes())
  
  // THE FIX: If the selected time is more than an hour in the past, 
  // the user obviously means tomorrow, so we push the date forward by 1 day!
  if (d.getTime() < now.getTime() - 60 * 60 * 1000) {
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

  const session = await auth()
  const sessionEmail = session?.user?.email ?? null
  const sessionName = session?.user?.name ?? null

  const effectiveUser = {
    email: sessionEmail ?? TEST_USER.email,
    name: sessionName ?? TEST_USER.name,
  }

  const user = await prisma.user.upsert({
    where: { email: effectiveUser.email },
    update: { name: effectiveUser.name },
    create: { name: effectiveUser.name, email: effectiveUser.email },
  })

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

  await pusher.trigger('global-pools', 'pools-updated', {})
  revalidatePath('/')
}

export async function deletePool(poolId: string) {
  if (!poolId) return
  await prisma.pool.delete({
    where: { id: poolId },
  })
  await pusher.trigger('global-pools', 'pools-updated', {})
  revalidatePath('/')
  revalidatePath('/rides')
}

export async function joinPool(poolId: string) {
  if (!poolId) return

  // 1. Figure out who is clicking the join button
  const session = await auth()
  const sessionEmail = session?.user?.email ?? null
  const sessionName = session?.user?.name ?? null

  const effectiveUser = {
    email: sessionEmail ?? TEST_USER.email,
    name: sessionName ?? TEST_USER.name,
  }

  // Ensure the user exists in the database
  const user = await prisma.user.upsert({
    where: { email: effectiveUser.email },
    update: { name: effectiveUser.name },
    create: { name: effectiveUser.name, email: effectiveUser.email },
  })

  // 2. Find the pool to make sure it has spots left
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { participants: true },
  })

  if (!pool || pool.spotsLeft <= 0) {
    await pusher.trigger('global-pools', 'pools-updated', {})
    revalidatePath('/')
    return
  }

  // Prevent a user from joining the same pool twice
  if (pool.participants.some((p: { id: string }) => p.id === user.id)) {
    await pusher.trigger('global-pools', 'pools-updated', {})
    revalidatePath('/')
    return
  }

  // 3. Update the pool: subtract a spot, update status if full, AND link the user
  const newSpotsLeft = pool.spotsLeft - 1
  await prisma.pool.update({
    where: { id: poolId },
    data: {
      spotsLeft: newSpotsLeft,
      status: newSpotsLeft === 0 ? 'FULL' : pool.status,
      participants: {
        connect: { id: user.id }, // <--- This permanently saves the user to the pool!
      },
    },
  })

  await pusher.trigger('global-pools', 'pools-updated', {})
  revalidatePath('/')
}
export async function closePool(poolId: string) {
  if (!poolId) return

  // 1. Change the status to keep it for the user's history
  await prisma.pool.update({
    where: { id: poolId },
    data: { status: 'COMPLETED' },
  })

  // 2. Erase all chats for privacy
  await prisma.message.deleteMany({
    where: { poolId: poolId },
  })

  await pusher.trigger('global-pools', 'pools-updated', {})
  revalidatePath('/')
}

export async function sweepStalePools() {
  // Calculate the time 2 hours ago from right now
  const expirationTime = new Date(Date.now() - 2 * 60 * 60 * 1000)

  // Find any pools that are incredibly old and wipe them from existence
  // (Because we set up Cascade deletion earlier, this deletes their chats too!)
  await prisma.pool.deleteMany({
    where: {
      leavingAt: { lt: expirationTime },
      status: { not: 'COMPLETED' }, // Don't delete successfully completed history!
    },
  })
}