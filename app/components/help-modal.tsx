'use client'

interface AppGuideModalProps {
  open: boolean
  onClose: () => void
}

export function HelpModal({ open, onClose }: AppGuideModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">App Guide & Constraints</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 focus:outline-none">
            ✕
          </button>
        </div>

        <div className="space-y-4 text-[13px] leading-relaxed text-zinc-600">
          <p>
            Welcome to the Campus Pool! This is a student-built application running entirely on free-tier infrastructure. Please use it responsibly so it stays online for everyone.
          </p>

          <div className="rounded-xl bg-zinc-50 p-4 border border-zinc-100">
            <h3 className="font-semibold text-zinc-900 mb-2">System Limits</h3>
            <ul className="list-disc pl-4 space-y-1.5 text-zinc-700 text-[12px]">
              <li><strong>Max Users:</strong> The live GPS and chat server can only handle 100 concurrent connections.</li>
              <li><strong>Chat Limit:</strong> To protect the database, users are limited to exactly 15 messages per pool ride.</li>
              <li><strong>GPS Tracking:</strong> The live map is highly accurate outdoors, but may struggle inside campus buildings.</li>
            </ul>
          </div>

          <p className="text-[11px] text-zinc-500 italic">
            Be kind, respect your co-riders, and ensure you arrive at the designated meeting spots on time.
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-zinc-900 py-2.5 text-[13px] font-medium text-white transition hover:bg-zinc-800"
        >
          Understood
        </button>
      </div>
    </div>
  )
}