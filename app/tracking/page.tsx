import { auth } from '../../auth'
import { prisma } from '../../lib/prisma'
import { DashboardShell } from '../components/dashboard-shell'
import { LiveTrackingContent } from '../components/live-tracking-content'

export default async function TrackingPage() {
  const session = await auth()
  const activePoolCount = await prisma.pool.count({ where: { status: 'ACTIVE' } })

  return (
    <DashboardShell userName={session?.user?.name ?? null} activePoolCount={activePoolCount}>
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-zinc-500">LIVE TRACKING</div>
      <LiveTrackingContent />
    </DashboardShell>
  )
}

