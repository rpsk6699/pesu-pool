'use client'

import { signIn } from 'next-auth/react'

export function GithubLoginButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("microsoft-entra-id")}
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-900 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50"
    >
      Continue with GitHub
    </button>
  )
}

