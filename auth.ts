import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
// import { PrismaAdapter } from "@auth/prisma-adapter"
// import { prisma } from "./lib/prisma" 

export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: PrismaAdapter(prisma), 
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      issuer: "https://login.microsoftonline.com/common/v2.0",
      
      // INTERCEPT AND CLEAN THE PROFILE DATA
      profile(profile) {
        let rawName = profile.name || ""
        
        // Look for the 4-digit year (e.g., 2025) and grab everything after it
        const yearMatch = rawName.match(/\b20\d{2}\b\s+(.*)/)
        let cleanName = yearMatch ? yearMatch[1] : rawName

        // Convert "RAHUL SHARMA" to "Rahul Sharma"
        cleanName = cleanName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')

        return {
          id: profile.sub || profile.oid,
          name: cleanName || "PESU Student",
          email: profile.preferred_username || profile.email,
          // image: profile.picture,
        }
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id") {
        const email = user.email?.toLowerCase()
        
        // THE BOUNCER: Only allow PESU student emails
        if (!email?.endsWith("@stu.pes.edu")) {
          return false 
        }
      }
      return true 
    },
  },
  // ADD THIS BACK: Point it to a separate login folder
  pages: {
    signIn: "/login",
  },
})