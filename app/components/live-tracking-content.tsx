'use client'

import dynamic from 'next/dynamic'

// Dynamically import the map to prevent Server-Side Rendering crashes
const TrackingMap = dynamic(() => import('./tracking-map'), { ssr: false })

export function LiveTrackingContent() {
  // Provide safe fallback values so the map loads correctly
  const activeUser = 'Arjun R.'
  const currentPoolId = null

  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
      <TrackingMap userName={activeUser} poolId={currentPoolId} />
    </div>
  )
}