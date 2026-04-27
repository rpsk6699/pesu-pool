"use client"

import { useTransition } from "react"
import { leavePool } from "@/app/actions/poolActions" // Adjust path if needed

export function LeavePoolButton({ poolId }: { poolId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleLeave = () => {
    // Optional: Add a quick confirmation dialog so they don't click it by accident
    if (!window.confirm("Are you sure you want to leave this pool?")) return

    startTransition(async () => {
      await leavePool(poolId)
    })
  }

  return (
    <button
      onClick={handleLeave}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-lg bg-red-50/50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 disabled:pointer-events-none disabled:opacity-50"
    >
      {isPending ? "Leaving..." : "Leave Pool"}
    </button>
  )
}