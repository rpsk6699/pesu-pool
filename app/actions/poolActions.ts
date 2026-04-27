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
  // 1. Get the current date exactly as it is in Bengaluru right now
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  // Intl format for en-US is MM/DD/YYYY, so we extract the pieces
  const parts = formatter.formatToParts(new Date())
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value

  // 2. Forcefully construct an ISO string locked to IST (+05:30)
  // This looks like: "2024-11-20T18:30:00+05:30"
  const exactIstTime = `${year}-${month}-${day}T${time}:00+05:30`
  
  // Now, no matter where Vercel's servers are, this Date is perfectly accurate
  const d = new Date(exactIstTime)
  
  // 3. If the selected time is more than an hour in the past, 
  // they obviously mean tomorrow, so push the date forward 1 day!
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

export async function leavePool(poolId: string) {
  if (!poolId) return

  // 1. Figure out who is clicking the leave button
  const session = await auth()
  const sessionEmail = session?.user?.email ?? null
  const sessionName = session?.user?.name ?? null

  const effectiveUser = {
    email: sessionEmail ?? TEST_USER.email,
    name: sessionName ?? TEST_USER.name,
  }

  // Ensure we have the user's DB record to get their ID
  const user = await prisma.user.upsert({
    where: { email: effectiveUser.email },
    update: { name: effectiveUser.name },
    create: { name: effectiveUser.name, email: effectiveUser.email },
  })

  // 2. Find the pool
  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: { participants: true },
  })

  if (!pool) return

  // Verify the user is actually in this pool before trying to remove them
  const isParticipant = pool.participants.some((p: { id: string }) => p.id === user.id)
  if (!isParticipant) return

  // 3. Update the pool: remove the user, add a spot back, and set to ACTIVE if it was FULL
  const newSpotsLeft = pool.spotsLeft + 1
  await prisma.pool.update({
    where: { id: poolId },
    data: {
      spotsLeft: newSpotsLeft,
      status: pool.status === 'FULL' ? 'ACTIVE' : pool.status,
      participants: {
        disconnect: { id: user.id }, // Breaks the link between user and pool
      },
    },
  })

  // 4. Trigger live updates so the open spot appears instantly
  await pusher.trigger('global-pools', 'pools-updated', {})
  revalidatePath('/')
  revalidatePath('/rides')
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

export async function completePool(poolId: string) {
  if (!poolId) return
  
  await prisma.pool.update({
    where: { id: poolId },
    data: { status: 'COMPLETED' },
  })
  
  await pusher.trigger('global-pools', 'pools-updated', {})
  
  revalidatePath('/')
  revalidatePath('/rides')
}