'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { createUser } from '@/lib/dataAccess'
import { RegistrationFormData, RegistrationResult } from '@/app/models/user/Registration'

export default function Register() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Add password validation function
  const validatePasswords = (password: string, confirmPassword: string) => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match')
    } else if (confirmPassword && password.length < 8) {
      setPasswordError('Password must be at least 8 characters long')
    } else {
      setPasswordError('')
    }
  }

  // Redirect authenticated users away from register page
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/') // Redirect to home/dashboard
    }
  }, [session, status, router])

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="max-w-md mx-auto mt-8 text-center">
        <p>Checking authentication...</p>
      </div>
    )
  }

  // Only show registration form for unauthenticated users
  if (status === 'unauthenticated') {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      
      // Reset errors
      setError('')
      
      // Final validation before submit
      if (formData.password !== formData.confirmPassword) {
        setPasswordError('Passwords do not match')
        return
      }

      if (formData.password.length < 8) {
        setPasswordError('Password must be at least 8 characters long')
        return
      }
      
      setLoading(true)
      
      try {
        // Call our dataAccess layer to create the user with Supabase
        const result = await createUser(
          formData.email,
          formData.password,
          {
            name: formData.name
          }
        ) as RegistrationResult;
        
        if (result.success) {
          // Registration successful, redirect to login
          router.push('/routes/login?registered=true')
        } else {
          // Registration failed, show error
          // The error from Supabase auth has a message property
          const errorMessage = result.error 
            ? typeof result.error === 'object' && result.error !== null && 'message' in result.error
              ? String(result.error.message)
              : 'Registration failed. Please try again.'
            : 'Registration failed. Please try again.';
          setError(errorMessage)
        }
      } catch (err: any) {
        console.error('Registration error:', err);
        setError(err?.message || 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Register as Member</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {passwordError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {passwordError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Name</label>
            <input
              type="text"
              className="w-full border p-2 rounded"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              className="w-full border p-2 rounded"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              className={`w-full border p-2 rounded ${passwordError ? 'border-red-500' : ''}`}
              value={formData.password}
              onChange={e => {
                const newPassword = e.target.value;
                setFormData({...formData, password: newPassword});
                validatePasswords(newPassword, formData.confirmPassword);
              }}
              required
              disabled={loading}
              minLength={8}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label className="block mb-1">Confirm Password</label>
            <input
              type="password"
              className={`w-full border p-2 rounded ${passwordError ? 'border-red-500' : ''}`}
              value={formData.confirmPassword}
              onChange={e => {
                const confirmPass = e.target.value;
                setFormData({...formData, confirmPassword: confirmPass});
                validatePasswords(formData.password, confirmPass);
              }}
              required
              disabled={loading}
              minLength={8}
              placeholder="Re-enter your password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={loading || !!passwordError}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-600">
          By registering, your account will be reviewed by an administrator before being approved.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          After approval, you can add your addresses in the Address Management section.
        </p>
      </div>
    )
  }

  // This return handles any other cases, though we should never reach here
  return (
    <div className="max-w-md mx-auto mt-8 text-center">
      <p>Authentication error. Please try again later.</p>
    </div>
  )
} 