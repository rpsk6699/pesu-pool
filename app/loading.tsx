export default function Loading() {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center space-y-4">
          {/* A slick, spinning loading ring */}
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-emerald-600"></div>
          <p className="text-sm font-medium text-zinc-500 animate-pulse">Loading PES Pool...</p>
        </div>
      </div>
    )
  }