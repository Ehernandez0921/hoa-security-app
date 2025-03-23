'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { User } from '@/app/models/admin/User'

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [emailConfirmLoading, setEmailConfirmLoading] = useState<Record<string, boolean>>({})
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  // Apply filters whenever users, roleFilter, statusFilter, or searchQuery changes
  useEffect(() => {
    let filtered = [...users]
    
    // Apply role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }
    
    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(user => 
        (user.name?.toLowerCase().includes(query) || 
         user.email?.toLowerCase().includes(query))
      )
    }
    
    setFilteredUsers(filtered)
  }, [users, roleFilter, statusFilter, searchQuery])

  // Security: Redirect non-admin users away from this page
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/routes/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'SYSTEM_ADMIN') {
      router.push('/')
    } else if (status === 'authenticated' && session?.user?.role === 'SYSTEM_ADMIN') {
      fetchUsers()
    }
  }, [status, session, router])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('Error fetching users:', err)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  async function updateUserRole(userId: string, newRole: string) {
    try {
      setSuccessMessage('')
      setError('')
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (error) throw error
      
      setSuccessMessage(`User role updated to ${newRole}`)
      
      // Update the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ))
    } catch (err: any) {
      console.error('Error updating user role:', err)
      setError('Failed to update user role')
    }
  }

  async function updateUserStatus(userId: string, newStatus: string) {
    try {
      setSuccessMessage('')
      setError('')
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (error) throw error
      
      setSuccessMessage(`User status updated to ${newStatus}`)
      
      // Update the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ))
    } catch (err: any) {
      console.error('Error updating user status:', err)
      setError('Failed to update user status')
    }
  }

  async function confirmUserEmail(userId: string) {
    try {
      if (!supabaseAdmin) {
        throw new Error('Admin client not available - cannot confirm email')
      }

      setEmailConfirmLoading(prev => ({ ...prev, [userId]: true }))
      setSuccessMessage('')
      setError('')
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      )

      if (error) throw error
      
      setSuccessMessage(`User email has been confirmed manually`)
      
    } catch (err: any) {
      console.error('Error confirming user email:', err)
      setError('Failed to confirm user email: ' + (err.message || 'Unknown error'))
    } finally {
      setEmailConfirmLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  // Show loading state
  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        <div className="bg-white shadow rounded p-4">
          <p>Loading users...</p>
        </div>
      </div>
    )
  }

  // Only show content to SYSTEM_ADMIN users
  if (status === 'authenticated' && session?.user?.role === 'SYSTEM_ADMIN') {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">User Management</h1>
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Box */}
          <div className="w-full max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="roleFilter" className="text-sm font-medium text-gray-700">
                Role:
              </label>
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-sm border rounded p-2 bg-white"
              >
                <option value="ALL">All Roles</option>
                <option value="MEMBER">Member</option>
                <option value="SECURITY_GUARD">Security Guard</option>
                <option value="SYSTEM_ADMIN">System Admin</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
                Status:
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border rounded p-2 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="flex items-center text-sm text-gray-500">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={user.status === 'PENDING' ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.email || 'No email in profile table'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="text-sm text-gray-900 border rounded p-1"
                    >
                      <option value="MEMBER">MEMBER</option>
                      <option value="SECURITY_GUARD">SECURITY_GUARD</option>
                      <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.status}
                      onChange={(e) => updateUserStatus(user.id, e.target.value)}
                      className="text-sm text-gray-900 border rounded p-1"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-xs text-gray-500 mb-2">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                      <br />
                      Updated: {new Date(user.updated_at).toLocaleDateString()}
                    </div>
                    {user.status === 'PENDING' && (
                      <button
                        onClick={() => confirmUserEmail(user.id)}
                        disabled={emailConfirmLoading[user.id]}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        {emailConfirmLoading[user.id] ? 'Working...' : 'Confirm Email'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Fallback for unauthorized users (shouldn't reach this due to the redirect in useEffect)
  return null
} 