'use client'

import { useEffect } from 'react'

type HelpModalProps = {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: HelpModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Background overlay */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-emerald-50/50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-950">Welcome to PES Pool</h2>
            <p className="text-[13px] font-medium text-emerald-700">Your quick guide to sharing rides</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 transition hover:bg-emerald-200"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5">
          
          <div className="space-y-6">
            {/* Features Section */}
            <section>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">✨ Key Features</h3>
              <div className="space-y-3">
                <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="text-xl">📍</div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-zinc-900">Live Map Tracking</h4>
                    <p className="mt-0.5 text-[12px] text-zinc-600">See exactly where your co-riders are on the map in real-time once you join a pool. Your marker is black!</p>
                  </div>
                </div>
                
                <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="text-xl">💬</div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-zinc-900">Built-in Pool Chat</h4>
                    <p className="mt-0.5 text-[12px] text-zinc-600">Coordinate your exact meeting spot without sharing your phone number.</p>
                  </div>
                </div>

                <div className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <div className="text-xl">📜</div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-zinc-900">Ride History</h4>
                    <p className="mt-0.5 text-[12px] text-zinc-600">When the pool creator clicks "Mark Reached", the ride is permanently saved to your history tab.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Constraints Section */}
            <section>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">⚠️ App Rules & Limits</h3>
              <ul className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-900">
                <li className="flex gap-2">
                  <span className="font-bold">1.</span>
                  <span><strong className="font-semibold">30-Minute Window:</strong> To keep the feed fresh, you can only schedule a pool up to 30 minutes in advance.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">2.</span>
                  <span><strong className="font-semibold">Auto-Close:</strong> If you forget to hit "Mark Reached", pools automatically close 1 hour after their scheduled departure time.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">3.</span>
                  <span><strong className="font-semibold">Chat Limits:</strong> To prevent spam, users are limited to 15 messages per pool.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">4.</span>
                  <span><strong className="font-semibold">Data Cleanup:</strong> Ride history is automatically cleared after 30 days to keep the app fast.</span>
                </li>
              </ul>
            </section>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-[13px] font-semibold text-white transition hover:bg-zinc-800"
          >
            Got it, let's go!
          </button>
        </div>
      </div>
    </div>
  )
}