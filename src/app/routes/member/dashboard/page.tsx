'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function MemberDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [accountStatus, setAccountStatus] = useState<string>('PENDING')
  const [loading, setLoading] = useState(true)

  // Fetch user profile to get current status
  useEffect(() => {
    async function fetchUserProfile() {
      if (status === 'authenticated' && session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        console.log('Fetching profile for email:', userEmail);
        try {
          // Use the user's email to get profile data with case-insensitive comparison
          const { data, error } = await supabase
            .from('profiles')
            .select('status')
            .ilike('email', userEmail)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
          } else if (data) {
            console.log('Profile data received:', data);
            setAccountStatus(data.status);
          } else {
            console.log('No profile data found');
          }
        } catch (error) {
          console.error('Unexpected error fetching profile:', error);
        } finally {
          setLoading(false);
        }
      } else if (status !== 'loading') {
        console.log('Not authenticated or no email:', { status, email: session?.user?.email });
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [status, session]);

  // Redirect unauthenticated users to login page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/routes/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'MEMBER') {
      // If authenticated but not a member, redirect to home
      router.push('/')
    }
  }, [status, session, router])

  // Show loading state while checking authentication
  if (status === 'loading' || loading) {
    return (
      <div className="max-w-4xl mx-auto mt-8 p-4">
        <p>Loading...</p>
      </div>
    )
  }

  // If we get here, the user is authenticated and is a MEMBER
  return (
    <div className="max-w-4xl mx-auto mt-8 p-4">
      <h1 className="text-3xl font-bold mb-6">Member Dashboard</h1>
      
      <p className="mb-6 text-gray-600">
        Welcome, {session?.user?.name || 'Member'}! This is your personal dashboard where you can manage your account and visitors.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Profile Card - Always shown */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-blue-700">Your Profile</h2>
          <p className="text-gray-600 mb-4">
            View and update your personal information, including your address.
          </p>
          <Link 
            href="/routes/profile" 
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Manage Profile
          </Link>
        </div>
        
        {/* Addresses Card - Only shown if APPROVED */}
        {accountStatus === 'APPROVED' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-3 text-purple-700">Your Addresses</h2>
            <p className="text-gray-600 mb-4">
              Manage multiple properties, set your primary address, and track approval status.
            </p>
            <Link 
              href="/routes/member/addresses" 
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
            >
              Manage Addresses
            </Link>
          </div>
        )}
        
        {/* Visitors Card - Only shown if APPROVED */}
        {accountStatus === 'APPROVED' && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold mb-3 text-green-700">Manage Visitors</h2>
            <p className="text-gray-600 mb-4">
              Add, edit, or remove visitors allowed to enter your address.
            </p>
            <Link 
              href="/routes/member/visitors" 
              className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              Manage Visitors
            </Link>
          </div>
        )}
      </div>

      {/* Status Information */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8">
        <h3 className="font-semibold text-gray-700 mb-2">Account Status</h3>
        <p className="text-gray-600">
          Your account status: <span className="font-medium">{accountStatus}</span>
        </p>
        {accountStatus === 'PENDING' && (
          <p className="mt-2 text-sm text-amber-600">
            Your account is pending approval by an administrator. Some features may be limited.
          </p>
        )}
      </div>

      {/* Quick Help */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">Need Help?</h3>
        <p className="text-blue-700 mb-4">
          If you need assistance with your account or have questions about the HOA community, please contact the administration.
        </p>
      </div>
    </div>
  )
} 