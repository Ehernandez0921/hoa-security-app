'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { getAuthProvider, getSupabaseProfile } from '@/lib/session'

export default function UserProfileInfo() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (status === 'authenticated' && session) {
        setLoading(true)
        const supabaseProfile = await getSupabaseProfile(session)
        setProfile(supabaseProfile)
        setLoading(false)
      } else if (status === 'unauthenticated') {
        setLoading(false)
      }
    }

    loadProfile()
  }, [session, status])

  if (status === 'loading' || loading) {
    return <div className="p-4 border rounded shadow-sm">Loading profile...</div>
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-4 border rounded shadow-sm">
        <p>Please log in to view your profile</p>
      </div>
    )
  }

  const authProvider = getAuthProvider(session)

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Authentication Method</p>
        <p className="font-medium">
          {authProvider === 'microsoft' ? 'Microsoft Account' : 'Email & Password'}
        </p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Email</p>
        <p className="font-medium">{session?.user?.email}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Name</p>
        <p className="font-medium">{session?.user?.name}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Role</p>
        <p className="font-medium">{session?.user?.role || 'No role assigned'}</p>
      </div>
      
      {profile && (
        <>
          <h3 className="text-lg font-semibold mt-6 mb-2">Supabase Profile Data</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-medium">{profile.address || 'No address provided'}</p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium">{profile.status}</p>
          </div>
          
          <div className="text-xs text-gray-400 mt-4">
            <p>Profile ID: {profile.id}</p>
            <p>Last updated: {new Date(profile.updated_at).toLocaleString()}</p>
          </div>
        </>
      )}
    </div>
  )
} 