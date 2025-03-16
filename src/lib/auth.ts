import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is mock data for development
        // In production, validate against your database
        const mockUsers = [
          {
            id: "1",
            name: "Admin User",
            email: "admin@example.com",
            password: "admin123", // In production, NEVER store plain text passwords
            role: "SYSTEM_ADMIN"
          },
          {
            id: "2",
            name: "Security Guard",
            email: "guard@example.com",
            password: "guard123",
            role: "SECURITY_GUARD"
          },
          {
            id: "3",
            name: "Member User",
            email: "member@example.com",
            password: "member123",
            role: "MEMBER"
          }
        ]

        const user = mockUsers.find(user => 
          user.email === credentials?.email && 
          user.password === credentials?.password
        )
        
        if (user) {
          // Never return the password
          const { password, ...userWithoutPass } = user
          return userWithoutPass
        }
        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key" // In production, use a proper secret
} 