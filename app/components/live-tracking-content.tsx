'use client'

import dynamic from 'next/dynamic'

const TrackingMap = dynamic(() => import('./tracking-map'), { ssr: false })

export function LiveTrackingContent() {
  return (
    <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
      <TrackingMap />
    </div>
  )
}

