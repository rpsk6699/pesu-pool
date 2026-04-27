'use client'

import { useRouter } from 'next/navigation'
import { HomeScreen, type HomePool } from './components/home-screen'
import { DashboardShell } from './components/dashboard-shell'

type HomeClientProps = {
  initialPools: HomePool[]
  activePoolCount: number
  userName?: string | null
}

export function HomeClient({ initialPools, activePoolCount, userName }: HomeClientProps) {
  const router = useRouter()

  // Extract exactly how many unique users are currently in active pools
  const uniqueUsers = new Set<string>()
  initialPools.forEach(pool => {
    if (pool.creator?.name) uniqueUsers.add(pool.creator.name)
    pool.participants?.forEach(p => {
      if (p.name) uniqueUsers.add(p.name)
    })
  })
  const liveUserCount = uniqueUsers.size

  return (
    <DashboardShell userName={userName} activePoolCount={activePoolCount} liveUserCount={liveUserCount}>
      <HomeScreen
        pools={initialPools}
        activePoolCount={activePoolCount}
        userName={userName}
      />
    </DashboardShell>
  )
}