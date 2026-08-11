'use client'

import { useRouter } from 'next/navigation'
import { HomeScreen, type HomePool } from './components/home-screen'
import { DashboardShell } from './components/dashboard-shell'

type HomeClientProps = {
  initialPools: HomePool[]
  activePoolCount: number
  userName?: string | null
  userId?: string | null
}

export function HomeClient({ initialPools, activePoolCount, userName, userId }: HomeClientProps) {
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
        userId={userId}
        onRaisePool={() => {
          // 1. Tell the Dashboard Shell to open the modal instantly
          window.dispatchEvent(new Event('openRaiseModal'))
          
          // 2. Silently update the URL so if they refresh, it stays open!
          window.history.pushState(null, '', '/?raisePool=true')
        }}
      />
    </DashboardShell>
  )
}