import { auth } from '../../auth'
import { prisma } from '../../lib/prisma'
import { DashboardShell } from '../components/dashboard-shell'
import { MyRidesScreen } from '../components/my-rides-screen'

export default async function RidesPage() {
  const session = await auth()
  const email = session?.user?.email ?? null

  const [activePoolCount, userPools] = await Promise.all([
    prisma.pool.count({ where: { status: 'ACTIVE' } }),
    email
      ? prisma.pool.findMany({
          where: {
            OR: [
              { creator: { email } },
              { participants: { some: { email } } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          include: { 
            creator: true, 
            participants: true 
          },
        })
      : Promise.resolve([]),
  ])

  return (
    <DashboardShell userName={session?.user?.name ?? null} activePoolCount={activePoolCount}>
      <MyRidesScreen pools={userPools} />
    </DashboardShell>
  )
}