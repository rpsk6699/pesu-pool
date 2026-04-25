import { prisma } from "../../lib/prisma"
import { auth } from "../../auth"
import { DashboardShell } from "../components/dashboard-shell"
import { ActivePoolsScreen } from "../components/active-pools-screen"
import { redirect } from "next/navigation"

export default async function ActivePoolsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  // 1. Calculate cleanup thresholds
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // 2. Perform Lazy Cleanup (Keep the database clean before fetching)
  await prisma.pool.updateMany({
    where: {
      leavingAt: { lt: oneHourAgo },
      status: { in: ['ACTIVE', 'FULL'] },
    },
    data: { status: 'COMPLETED' },
  })

  await prisma.pool.deleteMany({
    where: {
      createdAt: { lt: thirtyDaysAgo },
      status: 'COMPLETED'
    }
  })

  // 3. Fetch the active pools
  const [activePools, activePoolCount] = await Promise.all([
    prisma.pool.findMany({
      where: { status: { in: ['ACTIVE', 'FULL'] } },
      orderBy: { createdAt: "desc" },
      include: { creator: true, participants: true },
    }),
    prisma.pool.count({
      where: { status: { in: ['ACTIVE', 'FULL'] } }
    }),
  ])

  return (
    <DashboardShell userName={session?.user?.name ?? null} activePoolCount={activePoolCount}>
      <ActivePoolsScreen pools={activePools} userName={session?.user?.name ?? null} />
    </DashboardShell>
  )
}