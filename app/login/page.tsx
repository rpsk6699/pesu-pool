import Image from "next/image"
import { signIn } from "@/auth" // Make sure this path points to your auth.ts file

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#111318] p-4">
      
      <div className="mb-12 flex flex-col items-center">
        <Image
          src="/pesu-pool-logo.png" 
          alt="PESU Pool Logo"
          width={180} 
          height={180}
          priority 
          className="object-contain"
        />
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-[#1a1d24] p-2">
        {/* Using a server action form to trigger the login */}
        <form action={async () => {
          "use server"
          await signIn("microsoft-entra-id", { redirectTo: "/" })
        }}>
          <button
            type="submit"
            className="w-full rounded-xl bg-[#222630] py-4 text-center text-[15px] font-medium text-gray-200 transition-colors hover:bg-[#2d323f] active:bg-[#1a1d24]"
          >
            sign in with pesu email
          </button>
        </form>
      </div>

    </div>
  )
}