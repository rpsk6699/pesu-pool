import { auth } from '../../auth'
import { prisma } from '../../lib/prisma'
import { DashboardShell } from '../components/dashboard-shell'
import { LiveTrackingContent } from '../components/live-tracking-content'
import { getOrCreateUser } from '../../lib/auth-helpers'
import { redirect } from 'next/navigation'

export default async function TrackingPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const email = session.user.email
  const name = session.user.name ?? 'PESU Student'
  const currentUser = await getOrCreateUser(email, name)

  const [activePoolCount, activePool] = await Promise.all([
    prisma.pool.count({ where: { status: 'ACTIVE' } }),
    prisma.pool.findFirst({
      where: {
        status: { in: ['ACTIVE', 'FULL'] },
        OR: [
          { creatorId: currentUser.id },
          { participants: { some: { id: currentUser.id } } },
        ],
      },
      select: { id: true },
    }),
  ])

  return (
    <DashboardShell userName={session.user.name ?? null} activePoolCount={activePoolCount}>
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-zinc-500">LIVE TRACKING</div>
      <LiveTrackingContent
        userName={name}
        userId={currentUser.id}
        poolId={activePool?.id ?? null}
      />
    </DashboardShell>
  )
}
