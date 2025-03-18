'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import UserProfileInfo from '@/components/UserProfileInfo'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect unauthenticated users to login page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-4">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-4">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <p className="mb-6 text-gray-600">
        Your account information is displayed below. Data is synchronized between NextAuth.js and Supabase.
      </p>
      
      <UserProfileInfo />
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">About Your Authentication</h2>
        <p className="text-gray-600 mb-2">
          This application supports two authentication methods:
        </p>
        <ul className="list-disc list-inside text-gray-600 ml-4 space-y-1">
          <li>Microsoft Account login (via NextAuth.js)</li>
          <li>Email & Password login (via Supabase Auth)</li>
        </ul>
        <p className="text-gray-600 mt-2">
          Your profile data is maintained in Supabase regardless of which method you use to log in.
        </p>
      </div>
    </div>
  )
} 