'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { deletePool } from '../actions/poolActions'
import type { HomePool } from './home-screen'

function initials(name: string) {
  const compact = name.replace(/\s+/g, '').trim()
  if (!compact) return 'U'
  return compact.slice(0, 2).toUpperCase()
}

function formatLeavingMeta(leavingAt: string | Date) {
  const d = typeof leavingAt === 'string' ? new Date(leavingAt) : leavingAt
  if (Number.isNaN(d.getTime())) return 'time unavailable'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

export function MyRidesScreen({ pools }: { pools: HomePool[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium uppercase tracking-[0.04em] text-zinc-500">MY RIDES</div>

      {pools.length === 0 ? (
        <div className="w-full rounded-xl border border-zinc-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-700">No rides yet. Create your first pool to see history here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pools.map((pool) => (
            <article
              key={pool.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300"
            >
              <div className="flex">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-emerald-200 text-[10px] font-medium text-emerald-900">
                  {initials(pool.creator?.name ?? 'User')}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-zinc-900">
                  {(pool.creator?.name ?? 'User') + "'s pool"}{' '}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      pool.spotsLeft <= 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pool.spotsLeft} {pool.spotsLeft === 1 ? 'spot' : 'spots'} left
                  </span>
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px]">
                  <span className="font-medium text-zinc-900">{pool.routeFrom}</span>
                  <span className="text-emerald-600">→</span>
                  <span className="text-zinc-500">{pool.routeTo}</span>
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">{formatLeavingMeta(pool.leavingAt)}</p>
              </div>

              <div className="ml-2 flex items-center">
                {pool.status === 'COMPLETED' ? (
                  <span className="rounded-md bg-zinc-300 px-3 py-1.5 text-[12px] font-medium text-zinc-700">
                    Completed
                  </span>
                ) : (
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
                    Delete pool
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

