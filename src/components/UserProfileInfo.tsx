'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { getAuthProvider } from '@/lib/sessionClient'
import { getSupabaseProfile } from '@/lib/session'

export default function UserProfileInfo() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      if (status === 'authenticated' && session) {
        setLoading(true)
        try {
          console.log('Session details:', {
            userId: session.user?.id,
            email: session.user?.email,
            name: session.user?.name,
            role: session.user?.role
          })
          
          if (!session.user) {
            console.error('User missing from session');
            setLoading(false);
            return;
          }
          
          // Email is required for identification if ID is missing
          if (!session.user.id && !session.user.email) {
            console.error('User ID and email missing from session - cannot identify user');
            setLoading(false);
            return;
          }
          
          console.log('Loading profile for user email:', session.user.email)
          const supabaseProfile = await getSupabaseProfile(session)
          console.log('Loaded Supabase profile:', supabaseProfile)
          
          if (supabaseProfile) {
            setProfile(supabaseProfile)
          } else {
            console.warn('No profile data returned from Supabase');
            
            // Create a more accurate default profile object
            const defaultProfile = { 
              id: 'pending', 
              name: session.user.name || 'Unknown',
              email: session.user.email,
              role: session.user.role || 'MEMBER',
              status: 'PENDING',
              updated_at: new Date().toISOString() 
            };
            
            console.log('Using default profile:', defaultProfile);
            setProfile(defaultProfile);
          }
        } catch (error) {
          console.error('Error loading profile:', error)
        } finally {
          setLoading(false)
        }
      } else if (status === 'unauthenticated') {
        console.log('User is not authenticated');
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

  console.log('Rendering profile:', profile)

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Name</p>
        <p className="font-medium">{profile?.name || 'Not available'}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Email</p>
        <p className="font-medium">{profile?.email || 'Not available'}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Role</p>
        <p className="font-medium capitalize">{profile?.role?.toLowerCase() || 'Not available'}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Account Status</p>
        <p className={`font-medium ${profile?.status === 'APPROVED' ? 'text-green-600' : profile?.status === 'PENDING' ? 'text-amber-600' : 'text-red-600'}`}>
          {profile?.status || 'Unknown'}
        </p>
        {profile?.status === 'PENDING' && (
          <p className="text-xs text-amber-600 mt-1">
            Your account is pending administrator approval.
          </p>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Authentication Method</p>
        <p className="font-medium">{authProvider || 'Unknown'}</p>
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-500">Last Updated</p>
        <p className="text-xs text-gray-400">
          {profile?.updated_at ? new Date(profile.updated_at).toLocaleString() : 'Unknown'}
        </p>
      </div>
      
      <div className="mt-6 border-t pt-4">
        <h3 className="font-semibold mb-2">Address Management</h3>
        <p className="text-sm text-gray-600 mb-3">
          You can manage your addresses in the Addresses section of your account.
        </p>
        <a 
          href="/routes/member/addresses" 
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          Manage Addresses
        </a>
      </div>
    </div>
  )
} 