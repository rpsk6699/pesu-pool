'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { deletePool, joinPool, completePool } from '../actions/poolActions'
import { ChatBox } from './chat-box'
import { LeavePoolButton } from './leave-pool-button'
import PusherClient from 'pusher-js'

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
  creator: { name?: string | null; email?: string | null } | null
  participants?: { name?: string | null; email?: string | null }[] 
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

  if (min < -60) return 'Expired'
  if (min < 0) return `Left ${Math.abs(min)} min ago`
  if (min === 0) return 'leaving now'
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

  // Listen for background database updates
  useEffect(() => {
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    
    const channel = pusher.subscribe('global-pools')
    channel.bind('pools-updated', () => {
      router.refresh() 
    })

    return () => {
      pusher.unsubscribe('global-pools')
    }
  }, [router])

  const activeUser = userName || 'Guest'
  
  // --- FRONTEND BOUNCER CHECK ---
  // Check if this exact user is already the creator of ANY active pool in the list
  const hasCreatedActivePool = pools.some(pool => pool.creator?.name === activeUser)
  // ------------------------------
  
  const activePool = pools.find(pool => pool.creator?.name === activeUser) || pools.find(pool => pool.participants?.some(p => p.name === activeUser))
  const currentPoolId = activePool?.id || null

  return (
    <div className="flex flex-col gap-4">
      <div className="relative z-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <TrackingMap userName={activeUser} poolId={currentPoolId} />
      </div>

      <h2 className="mt-2 text-xs font-bold tracking-[0.04em] text-zinc-500 uppercase">Active pools</h2>

      <div className="flex flex-col gap-2.5">
        {pools.map((pool) => (
          <article
            key={pool.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300"
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-emerald-100 text-[12px] font-bold text-emerald-800">
                {initials(pool.creator?.name ?? 'User')}
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-zinc-900">
                  <span className="truncate">{(pool.creator?.name ?? 'Someone') + "'s pool"}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${
                      pool.spotsLeft <= 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pool.spotsLeft} {pool.spotsLeft === 1 ? 'SPOT' : 'SPOTS'} LEFT
                  </span>
                </p>
                
                <div className="mt-2 flex flex-col gap-1 text-[13px]">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></div>
                    <span className="font-medium text-zinc-800">{pool.routeFrom}</span>
                  </div>
                  <div className="ml-1 h-3 border-l-2 border-dashed border-zinc-200"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-zinc-400"></div>
                    <span className="text-zinc-600">{pool.routeTo}</span>
                  </div>
                </div>
                
                <p className="mt-2 inline-block rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
                  {formatLeavingMeta(pool.leavingAt)}
                </p>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
              {(() => {
                const isCreator = pool.creator?.name === activeUser
                const hasJoined = pool.participants?.some((p) => p.name === activeUser)
                const lobbyFull = pool.spotsLeft === 0 || pool.status === 'FULL'

                if (isCreator) {
                  return (
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex w-full gap-2">
                        <button 
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await completePool(pool.id)
                              router.refresh()
                            })
                          }
                          className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
                        >
                          Mark Reached
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await deletePool(pool.id)
                              router.refresh()
                            })
                          }
                          className="flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-[13px] font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                      <ChatBox poolId={pool.id} userName={activeUser} />
                    </div>
                  )
                }

                if (hasJoined) {
                  return (
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex w-full gap-2">
                        <button
                          type="button"
                          disabled
                          className="flex-1 rounded-md bg-zinc-200 px-3 py-2 text-[13px] font-medium text-zinc-500"
                        >
                          Joined!
                        </button>
                        <div className="flex-1">
                          <LeavePoolButton poolId={pool.id} />
                        </div>
                      </div>
                      <ChatBox poolId={pool.id} userName={activeUser} />
                    </div>
                  )
                }

                if (lobbyFull) {
                  return (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-md bg-zinc-200 px-3 py-2 text-[13px] font-medium text-zinc-500"
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
                    className="w-full rounded-md bg-emerald-600 px-3 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Join pool
                  </button>
                )
              })()}
            </div>
          </article>
        ))}
      </div>

      {/* SMART RAISE POOL BUTTON */}
      <div className="flex flex-col gap-2.5 sm:flex-row mt-2">
        <button
          type="button"
          disabled={hasCreatedActivePool}
          onClick={hasCreatedActivePool ? undefined : onRaisePool}
          className={`flex w-full items-center justify-center rounded-md border px-3 py-2.5 text-[13px] font-medium transition shadow-sm sm:flex-1 ${
            hasCreatedActivePool
              ? 'cursor-not-allowed bg-zinc-200 border-zinc-200 text-zinc-500' // Disabled grey state
              : 'cursor-pointer bg-emerald-600 border-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 active:scale-[0.98]'
          }`}
        >
          {hasCreatedActivePool ? 'You already have an active pool' : '+ Raise a pool'}
        </button>
      </div>
    </div>
  )
}