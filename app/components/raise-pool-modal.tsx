'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPool } from '../actions/poolActions'

type RaisePoolModalProps = {
  open: boolean
  onClose: () => void
  routeFromOptions?: string[]
  routeToOptions?: string[]
  afterCreate?: () => void
}

export function RaisePoolModal({
  open,
  onClose,
  routeFromOptions,
  routeToOptions,
  afterCreate,
}: RaisePoolModalProps) {
  const router = useRouter()
  const ROUTES = useMemo(() => {
    const from = routeFromOptions?.length ? routeFromOptions : []
    const to = routeToOptions?.length ? routeToOptions : []

    // If caller passes options, we still render the mock route cards (since that's the requested UI),
    // but we can use the options later to expand the set.
    void from
    void to

    return [
      {
        id: 'metro->front',
        section: 'GOING TO COLLEGE - FROM METRO',
        from: 'Mysore Road Metro Bus Stop (PES side)',
        to: 'PESU Front Gate',
        tag: 'Front gate',
      },
      {
        id: 'metro->back',
        section: 'GOING TO COLLEGE - FROM METRO',
        from: 'Mysore Road Metro Bus Stop (PES side)',
        to: 'PESU Back Gate',
        tag: 'Back gate',
      },
      {
        id: 'front->attiguppe',
        section: 'GOING HOME - FROM PESU',
        from: 'PESU Front Gate',
        to: 'Mysore Road Metro Bus Stop (Attiguppe side)',
        tag: 'Front gate',
      },
      {
        id: 'back->attiguppe',
        section: 'GOING HOME - FROM PESU',
        from: 'PESU Back Gate',
        to: 'Mysore Road Metro Bus Stop (Attiguppe side)',
        tag: 'Back gate',
      },
    ] as const
  }, [routeFromOptions, routeToOptions])

  const [selectedRoute, setSelectedRoute] = useState<(typeof ROUTES)[number]['id']>(ROUTES[0].id)
  const [leavingAt, setLeavingAt] = useState('08:15')
  const [maxRiders, setMaxRiders] = useState<number>(2)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const selected = ROUTES.find((r) => r.id === selectedRoute) ?? ROUTES[0]
  const selectedText = `${selected.from} → ${selected.to}`

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const RouteCard = ({
    route,
  }: {
    route: (typeof ROUTES)[number]
  }) => {
    const active = route.id === selectedRoute
    return (
      <button
        type="button"
        onClick={() => setSelectedRoute(route.id)}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
          active ? 'border-emerald-500 bg-emerald-50' : 'border-zinc-200 bg-white hover:border-zinc-300'
        }`}
      >
        <div
          className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
            active ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300 bg-white'
          }`}
          aria-hidden="true"
        >
          {active ? <div className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className={`text-[13px] font-medium ${active ? 'text-emerald-950' : 'text-zinc-900'}`}>
            {route.from}
          </div>
          <div className={`mt-0.5 text-[11px] ${active ? 'text-emerald-700' : 'text-zinc-500'}`}>
            → {route.to}
          </div>
        </div>

        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            active ? 'bg-emerald-200 text-emerald-950' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {route.tag}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* ADDED max-h-[90vh] and overflow-y-auto to this container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">Raise a pool</h2>
            <p className="mt-1 text-sm text-zinc-500">Where are you departing from?</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setErrorMsg('') // Clear previous errors

            // Time math validation
            const [hh, mm] = leavingAt.split(':').map(Number)
            let selectedDate = new Date()
            selectedDate.setSeconds(0, 0)
            selectedDate.setHours(hh, mm)
            
            let diffMins = (selectedDate.getTime() - new Date().getTime()) / 60000

            // Handle crossing midnight (e.g. it is 23:50 and they select 00:15)
            if (diffMins < -1000) {
              selectedDate.setDate(selectedDate.getDate() + 1)
              diffMins = (selectedDate.getTime() - new Date().getTime()) / 60000
            }

            if (diffMins < -5) {
              setErrorMsg('You cannot schedule a pool in the past.')
              return
            }
            if (diffMins > 30) {
              setErrorMsg('Pools can only be scheduled up to 30 minutes in advance.')
              return
            }

            if (isSubmitting) return
            setIsSubmitting(true)
            try {
              const form = e.currentTarget
              const formData = new FormData(form)
              await createPool(formData)
              router.refresh()
              onClose()
              afterCreate?.()
            } catch (err) {
              setErrorMsg('Failed to create pool. Try again.')
            } finally {
              setIsSubmitting(false)
            }
          }}
          className="mt-4"
        >
          <input type="hidden" name="routeFrom" value={selected.from} />
          <input type="hidden" name="routeTo" value={selected.to} />
          <input type="hidden" name="spotsTotal" value={String(maxRiders)} />
          <input type="hidden" name="leavingTime" value={leavingAt} />

          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-zinc-500">
                GOING TO COLLEGE - FROM METRO
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {ROUTES.filter((r) => r.section === 'GOING TO COLLEGE - FROM METRO').map((r) => (
                  <RouteCard key={r.id} route={r} />
                ))}
              </div>
            </div>

            <div className="h-px bg-zinc-100" />

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-zinc-500">
                GOING HOME - FROM PESU
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {ROUTES.filter((r) => r.section === 'GOING HOME - FROM PESU').map((r) => (
                  <RouteCard key={r.id} route={r} />
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-zinc-600">Meet At</span>
                  <input
                    type="time"
                    value={leavingAt}
                    onChange={(e) => setLeavingAt(e.target.value)}
                    className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                  />
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] text-zinc-600">Max co-riders (excluding you)</span>
                  <div className="flex overflow-hidden rounded-md border border-zinc-300 bg-white">
                    {[1, 2, 3].map((n) => {
                      const active = maxRiders === n
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setMaxRiders(n)}
                          className={`h-10 flex-1 text-sm font-medium transition ${
                            active ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-800">
              {selectedText}
            </div>
            
            {/* Show error message if time constraint fails */}
            {errorMsg && (
              <div className="rounded-md bg-red-50 p-3 text-[12px] font-medium text-red-600 border border-red-100">
                {errorMsg}
              </div>
            )}


            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full shrink-0 rounded-md bg-emerald-600 px-4 text-[13px] font-medium text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-60"
            >
              {isSubmitting ? 'Posting…' : 'Post pool request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}