import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    id?: string
    provider?: string
  }
  
  interface Session {
    user: {
      role?: string
      id?: string
      provider?: string
    } & DefaultSession["user"]
  }
  
  interface JWT {
    userId?: string
    role?: string
    provider?: string
  }
} 