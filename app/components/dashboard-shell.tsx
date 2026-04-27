'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from './sidebar'
import { HelpModal } from './help-modal'
import { ProfileMenu } from './profile-menu'
import { RaisePoolModal } from './raise-pool-modal'

type DashboardShellProps = {
  userName?: string | null
  activePoolCount: number
  liveUserCount?: number
  children: React.ReactNode
}

export function DashboardShell({ userName, activePoolCount, liveUserCount = 0, children }: DashboardShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [greeting, setGreeting] = useState('Good evening')

  // Dynamic Greeting (IST)
  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    })
    const currentHour = parseInt(formatter.format(new Date()), 10)
    if (currentHour >= 5 && currentHour < 12) setGreeting('Good morning')
    else if (currentHour >= 12 && currentHour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Auto-show Guide
  useEffect(() => {
    const hasSeenGuide = sessionStorage.getItem('hasSeenAppGuide')
    if (!hasSeenGuide) {
      const timer = setTimeout(() => setHelpOpen(true), 800)
      sessionStorage.setItem('hasSeenAppGuide', 'true')
      return () => clearTimeout(timer)
    }
  }, [])

  // THE RESTORED TIMEOUT LOGIC: Fixes the modal not opening bug
  const shouldOpenModal = searchParams.get('raisePool') === 'true'
  
  useEffect(() => {
    if (shouldOpenModal) {
      const t = window.setTimeout(() => setModalOpen(true), 10)
      return () => window.clearTimeout(t)
    } else {
      setModalOpen(false)
    }
  }, [shouldOpenModal])

  const closeModal = () => {
    setModalOpen(false)
    router.push('/')
  }

  const routes = useMemo(() => ({
    from: ['Mysore Road Metro', 'Attiguppe Metro Station', 'Nayandahalli Metro', 'PESU Front Gate', 'PESU Back Gate', 'RR Nagar Arch'],
    to: ['Mysore Road Metro', 'Attiguppe Metro Station', 'Nayandahalli Metro', 'PESU Front Gate', 'PESU Back Gate', 'RR Nagar Arch'],
  }), [])

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl app-shell">
        <Sidebar
          onHelp={() => setHelpOpen(true)}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          collapsed={sidebarCollapsed}
        />

        <div className="main">
          <div className="topbar relative z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (window.matchMedia('(min-width: 768px)').matches) setSidebarCollapsed((v) => !v)
                  else setSidebarOpen(true)
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-900 transition hover:bg-zinc-100"
              >
                <span>☰</span>
              </button>
              <div>
                <div className="flex items-center gap-3 mb-0.5">
                  <div className="topbar-title">{greeting}, {userName ?? 'Meow'}</div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                    </span>
                    {liveUserCount} / 100 Live Users
                  </div>
                </div>
                <div className="topbar-sub">{activePoolCount} active pools near you</div>
              </div>
            </div>
            <ProfileMenu />
          </div>

          <div className="content">{children}</div>
        </div>
      </div>

      <RaisePoolModal
        open={modalOpen}
        onClose={closeModal}
        routeFromOptions={routes.from}
        routeToOptions={routes.to}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}