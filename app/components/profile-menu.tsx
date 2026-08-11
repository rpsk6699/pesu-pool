'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

function initials(nameOrEmail: string) {
  const s = nameOrEmail.trim()
  if (!s) return 'U'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  const one = parts[0]
  return (one.slice(0, 2) || 'U').toUpperCase()
}

export function ProfileMenu() {
  const { data: session, status } = useSession()
  const name = session?.user?.name ?? session?.user?.email ?? null
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (e.target instanceof Node && !ref.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  if (status === 'loading') {
    return (
      <div className="h-9 w-[120px] rounded-full border border-zinc-200 bg-white/60" aria-hidden="true" />
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!name) return signIn('microsoft-entra-id')
          setOpen((v) => !v)
        }}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-700 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-[10px] font-semibold text-emerald-900">
          {initials(name ?? 'User')}
        </span>
        <span className="hidden sm:inline">{name ?? 'Sign in'}</span>
        <span className="text-zinc-400">▾</span>
      </button>

      {open && name ? (
        <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="px-3 py-2">
            <div className="text-[11px] text-zinc-500">Signed in as</div>
            <div className="truncate text-[12px] font-medium text-zinc-900">{name}</div>
          </div>
          <div className="h-px bg-zinc-100" />
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-emerald-700 transition hover:bg-emerald-50"
          >
            Sign out
            <span aria-hidden="true">↩</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}

