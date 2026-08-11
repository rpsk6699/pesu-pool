import { auth } from '../../auth'
import { prisma } from '../../lib/prisma'
import { DashboardShell } from '../components/dashboard-shell'
import { MyRidesScreen } from '../components/my-rides-screen'
import { getOrCreateUser } from '../../lib/auth-helpers'
import { poolFeedInclude } from '../../lib/pool-queries'
import { redirect } from 'next/navigation'

export default async function RidesPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect('/login')
  }

  const email = session.user.email
  const name = session.user.name ?? 'PESU Student'
  const currentUser = await getOrCreateUser(email, name)

  const [activePoolCount, userPools] = await Promise.all([
    prisma.pool.count({ where: { status: 'ACTIVE' } }),
    prisma.pool.findMany({
      where: {
        OR: [
          { creatorId: currentUser.id },
          { participants: { some: { id: currentUser.id } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: poolFeedInclude,
    }),
  ])

  return (
    <DashboardShell userName={session.user.name ?? null} activePoolCount={activePoolCount}>
      <MyRidesScreen pools={userPools} currentUserId={currentUser.id} />
    </DashboardShell>
  )
}
