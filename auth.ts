import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"

export const { handlers, auth, signIn, signOut } = NextAuth({
  // adapter: PrismaAdapter(prisma), // Keep this uncommented to save users to the DB
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_AZURE_AD_ID,
      clientSecret: process.env.AUTH_AZURE_AD_SECRET,
      // The new way NextAuth handles the "common" multitenant setup:
      issuer: "https://login.microsoftonline.com/common/v2.0", 
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Check for the new provider ID
      if (account?.provider === "microsoft-entra-id") {
        const email = user.email?.toLowerCase()
        
        // THE BOUNCER: Only allow PESU student emails
        if (!email?.endsWith("@stu.pes.edu")) {
          return false // Blocks the login and redirects to Access Denied
        }
      }
      
      return true // Lets them in!
    },
  },
})