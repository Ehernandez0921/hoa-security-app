'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { hasRole } from '@/lib/session'
import Link from 'next/link'

export default function AdminIndexPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Security check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && !hasRole(session, 'SYSTEM_ADMIN')) {
      router.push('/')
    }
  }, [status, session, router])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <p>Loading...</p>
      </div>
    )
  }

  // Only show to SYSTEM_ADMIN users
  if (status === 'authenticated' && hasRole(session, 'SYSTEM_ADMIN')) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/routes/admin/users" className="p-6 bg-white shadow rounded hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">User Management</h2>
            <p>View and update user roles and statuses</p>
          </Link>
          
          <Link href="/routes/admin/addresses" className="p-6 bg-white shadow rounded hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-2">Address Management</h2>
            <p>Review, verify and approve member addresses</p>
          </Link>
          
          {/* Add more admin panels as needed */}
        </div>
      </div>
    )
  }

  // Fallback
  return null
} 