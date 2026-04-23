'use client'

import { ChatBox } from './chat-box'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import dynamic from 'next/dynamic'
import { deletePool, joinPool, closePool } from '../actions/poolActions'

// Dynamically import the map to prevent Server-Side Rendering crashes
const TrackingMap = dynamic(() => import('./tracking-map'), { ssr: false })

export type HomePool = {
  id: string
  routeFrom: string
  routeTo: string
  spotsLeft: number
  spotsTotal: number
  leavingAt: string | Date
  status: string
  creator: { name?: string | null } | null
  participants?: { name?: string | null }[] 
}

function initials(name: string) {
  const compact = name.replace(/\s+/g, '').trim()
  if (!compact) return 'U'
  return compact.slice(0, 2).toUpperCase()
}

function formatLeavingMeta(leavingAt: string | Date) {
  const d = typeof leavingAt === 'string' ? new Date(leavingAt) : leavingAt
  if (Number.isNaN(d.getTime())) return 'leaving soon'
  const diffMs = d.getTime() - Date.now()
  const min = Math.round(diffMs / 60000)
  if (min <= 1) return 'leaving now'
  if (min < 60) return `leaving in ${min} min`
  const h = Math.round(min / 60)
  return `leaving in ${h} hr`
}

export function HomeScreen({
  onRaisePool,
  pools,
  activePoolCount,
  userName,
}: {
  onRaisePool: () => void
  pools: HomePool[]
  activePoolCount: number
  userName?: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Align the frontend fallback with the backend fallback
  const activeUser = userName || 'Arjun R.'

  // Use activeUser to check the database arrays
  const activePool = pools.find(pool => pool.creator?.name === activeUser) || pools.find(pool => pool.participants?.some(p => p.name === activeUser))
  const currentPoolId = activePool?.id || null

  return (
    <div className="flex flex-col gap-4">
      <div className="relative z-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <TrackingMap userName={activeUser} poolId={currentPoolId} />
      </div>

      <h2 className="text-xs font-medium tracking-[0.04em] text-zinc-500 uppercase mt-2">Active pools</h2>

      <div className="flex flex-col gap-2.5">
        {pools.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <p className="text-[13px] text-zinc-500">No active pools right now.</p>
          </div>
        ) : (
          pools.map((pool) => {
            const isCreator = pool.creator?.name === activeUser
            const hasJoined = pool.participants?.some(p => p.name === activeUser)
            const lobbyFull = pool.spotsLeft === 0 || pool.status === 'FULL'

            return (
              <article
                key={pool.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300"
              >
                {/* Top Row: Ride Details and Action Buttons */}
                <div className="flex w-full items-center gap-3">
                  <div className="flex">
                    <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-emerald-200 text-[10px] font-medium text-emerald-900">
                      {initials(pool.creator?.name ?? 'User')}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-zinc-900">
                      {(pool.creator?.name ?? 'Someone') + "'s pool"}{' '}
                      {pool.status !== 'COMPLETED' && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            pool.spotsLeft <= 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pool.spotsLeft} {pool.spotsLeft === 1 ? 'spot' : 'spots'} left
                        </span>
                      )}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[11px]">
                      <span className="font-medium text-zinc-900">{pool.routeFrom}</span>
                      <span className="text-emerald-600">→</span>
                      <span className="text-zinc-500">{pool.routeTo}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">{formatLeavingMeta(pool.leavingAt)}</p>
                  </div>

                  <div className="ml-2 flex items-center">
                    {(() => {
                      if (pool.status === 'COMPLETED') {
                        return (
                          <span className="rounded-md bg-zinc-100 px-3 py-1.5 text-[12px] font-bold text-zinc-500">
                            Ride Finished
                          </span>
                        )
                      }

                      if (isCreator) {
                        return (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                startTransition(async () => {
                                  await closePool(pool.id)
                                  router.refresh()
                                })
                              }
                              className="rounded-md bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                            >
                              Mark Reached
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                startTransition(async () => {
                                  await deletePool(pool.id)
                                  router.refresh()
                                })
                              }
                              className="rounded-md border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )
                      }

                      if (hasJoined) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="rounded-md bg-zinc-300 px-3 py-1.5 text-[12px] font-medium text-zinc-600"
                          >
                            Joined!
                          </button>
                        )
                      }

                      if (lobbyFull) {
                        return (
                          <button
                            type="button"
                            disabled
                            className="rounded-md bg-zinc-300 px-3 py-1.5 text-[12px] font-medium text-zinc-600"
                          >
                            Lobby Full
                          </button>
                        )
                      }

                      return (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await joinPool(pool.id)
                              router.refresh()
                            })
                          }
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Join pool
                        </button>
                      )
                    })()}
                  </div>
                </div>

                {/* Bottom Row: Chat Box (Only visible if creator or participant AND ride is active) */}
                {(isCreator || hasJoined) && pool.status !== 'COMPLETED' && (
                  <div className="w-full border-t border-zinc-100 pt-1">
                    <ChatBox poolId={pool.id} userName={activeUser} />
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row mt-2">
        <button
          type="button"
          onClick={onRaisePool}
          className="flex w-full cursor-pointer items-center justify-center rounded-md border border-emerald-600 bg-emerald-600 px-3 py-2.5 text-[13px] font-medium text-white transition hover:border-emerald-700 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 sm:flex-1"
        >
          + Raise a pool
        </button>
      </div>
    </div>
  )
}