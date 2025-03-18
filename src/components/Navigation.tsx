'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function Navigation() {
  const { data: session } = useSession()

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Gate Security App
        </Link>
        
        <div className="space-x-4">
          {!session ? (
            <>
              <Link href="/routes/login">Login</Link>
              <Link href="/routes/register">Register</Link>
            </>
          ) : (
            <>
              {session.user.role === 'SYSTEM_ADMIN' && (
                <>
                  <Link href="/routes/admin/requests">Member Requests</Link>
                  <Link href="/routes/admin/guards">Manage Guards</Link>
                  <Link href="/routes/admin/users">Manage Users</Link>
                </>
              )}
              {session.user.role === 'MEMBER' && (
                <Link href="/member/visitors">Manage Visitors</Link>
              )}
              {session.user.role === 'SECURITY_GUARD' && (
                <Link href="/routes/guard/lookup">Address Lookup</Link>
              )}
              <Link href="/profile">Profile</Link>
              <Link href="/api/auth/signout">Logout</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
} 