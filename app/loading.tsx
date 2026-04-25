import { DashboardShell } from "./components/dashboard-shell"

export default function Loading() {
  return (
    <DashboardShell activePoolCount={0} userName="...">
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        {/* A slick, spinning loading ring */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"></div>
        <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading pools...</p>
      </div>
    </DashboardShell>
  )
}