'use client'

import { useEffect } from 'react'
import { setupDatabase } from '../backend/setup'
import { SessionProvider } from 'next-auth/react'
import Navigation from './Navigation'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Run database setup on the client side only
  useEffect(() => {
    setupDatabase().catch(console.error)
  }, [])

  return (
    <SessionProvider>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </SessionProvider>
  )
} 