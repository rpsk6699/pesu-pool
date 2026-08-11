'use client'

import dynamic from 'next/dynamic'

const TrackingMap = dynamic(() => import('./tracking-map'), { ssr: false })

type LiveTrackingContentProps = {
  userName: string
  userId: string
  poolId: string | null
}

export function LiveTrackingContent({ userName, userId, poolId }: LiveTrackingContentProps) {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
      {poolId ? (
        <TrackingMap userName={userName} userId={userId} poolId={poolId} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-3xl">📍</span>
          <p className="text-sm font-medium text-zinc-900">No active pool to track</p>
          <p className="max-w-sm text-xs text-zinc-500">
            Join or create a pool from the home screen to share live location with your co-riders.
          </p>
        </div>
      )}
    </div>
  )
}
