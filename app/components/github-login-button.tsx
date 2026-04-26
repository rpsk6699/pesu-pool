'use client'

import { signIn } from 'next-auth/react'

export function PesuLoginButton() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-[#1a1d24] p-2">
      <button
        type="button"
        onClick={() => signIn("microsoft-entra-id")}
        className="w-full rounded-xl bg-[#222630] py-4 text-center text-[15px] font-medium text-gray-200 transition-colors hover:bg-[#2d323f] active:bg-[#1a1d24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50"
      >
        sign in with pesu email
      </button>
    </div>
  )
}