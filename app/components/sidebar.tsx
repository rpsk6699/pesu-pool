'use client'

import Link from 'next/link'

type SidebarProps = {
  onHelp: () => void
  open: boolean
  setOpen: (open: boolean) => void
  collapsed: boolean
}

export function Sidebar({ onHelp, open, setOpen, collapsed }: SidebarProps) {
  const itemBase =
    'flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900'
  const itemActive = 'bg-emerald-50 text-emerald-800'

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed left-0 top-0 z-50 h-full transform bg-white transition-transform md:static md:z-auto md:h-auto md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'w-[72px]' : 'w-[220px]'} border-r border-zinc-200`}
      >
        <div className="flex flex-col gap-1 px-2 py-3">
          <Link
            className={`${itemBase} ${itemActive} justify-${collapsed ? 'center' : 'start'}`}
            href="/"
            onClick={() => setOpen(false)}
          >
            <span className="w-5 text-center">■</span>
            {!collapsed ? <span>Home</span> : null}
          </Link>

          {/* NEW: Find Active Pools Button */}
          <Link
            className={`${itemBase} ${collapsed ? 'justify-center' : 'justify-start'}`}
            href="/active-pools"
            onClick={() => setOpen(false)}
          >
            <span className="w-5 text-center">🔍</span>
            {!collapsed ? <span>Find Active Pools</span> : null}
          </Link>

          <Link
            className={`${itemBase} w-full ${collapsed ? 'justify-center' : 'justify-start'}`}
            href="/?raisePool=true"
            onClick={() => setOpen(false)}
          >
            <span className="w-5 text-center">+</span>
            {!collapsed ? <span>Raise a pool</span> : null}
          </Link>

          <Link
            className={`${itemBase} ${collapsed ? 'justify-center' : 'justify-start'}`}
            href="/tracking"
            onClick={() => setOpen(false)}
          >
            <span className="w-5 text-center">●</span>
            {!collapsed ? <span>Live tracking</span> : null}
          </Link>

          <Link
            className={`${itemBase} ${collapsed ? 'justify-center' : 'justify-start'}`}
            href="/rides"
            onClick={() => setOpen(false)}
          >
            <span className="w-5 text-center">☰</span>
            {!collapsed ? <span>My rides</span> : null}
          </Link>

          <button
            type="button"
            className={`${itemBase} w-full ${collapsed ? 'justify-center' : 'justify-start'}`}
            onClick={() => {
              setOpen(false)
              onHelp()
            }}
          >
            <span className="w-5 text-center">?</span>
            {!collapsed ? <span>App Guide</span> : null}
          </button>

          {/* NEW: Feedback Email Link */}
          <a
            href="mailto:rahulsharma98172@gmail.com?subject=PES Pool App Feedback"
            className={`${itemBase} w-full ${collapsed ? 'justify-center' : 'justify-start'} mt-auto`}
            onClick={() => setOpen(false)}
          >
            <span className="w-5 text-center">✉</span>
            {!collapsed ? <span>Feedback</span> : null}
          </a>
        </div>
      </aside>
    </>
  )
}