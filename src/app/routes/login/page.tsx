'use client'

import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginFormData } from '@/app/models/auth/Login'

interface ResetResponse {
  message: string;
  exists: boolean;
  isOAuth: boolean;
  provider?: 'microsoft' | 'google';
}

export default function Login() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRegistered = searchParams.get('registered') === 'true'
  const { data: session, status } = useSession()
  const [error, setError] = useState<ReactNode>('')
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'oauth'>('idle')
  const [resetMessage, setResetMessage] = useState('')
  const [resetData, setResetData] = useState<ResetResponse | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Redirect authenticated users away from login page
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

  // Only show login form for unauthenticated users
  if (status === 'unauthenticated') {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setError('') // Clear previous errors
      
      try {
        console.log(`Attempting to sign in with email: ${formData.email}`)
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        console.log("Sign in result:", result)
        
        if (result?.error) {
          console.log(`Login error: ${result.error}`)
          
          // Handle specific error messages
          if (result.error.includes('confirm your account')) {
            setError(
              <div>
                <p className="font-bold">Email verification required</p>
                <p className="mt-1">Your account needs to be verified before you can log in.</p>
                <ul className="list-disc ml-5 mt-2 text-sm">
                  <li>Check your email inbox (and spam folder) for a verification link from Supabase</li>
                  <li>Click the verification link in the email to confirm your account</li>
                  <li>Return to this page and try logging in again</li>
                </ul>
                <p className="mt-2 text-sm">
                  {resendSuccess ? (
                    <span className="text-green-700">
                      Verification email sent! Please check your inbox (and spam folder).
                    </span>
                  ) : (
                    <button 
                      className="text-blue-700 underline disabled:text-gray-400"
                      onClick={handleResendVerification}
                      disabled={resendingEmail}
                    >
                      {resendingEmail ? 'Sending...' : 'Didn\'t receive the email? Click here to resend verification'}
                    </button>
                  )}
                </p>
              </div>
            )
          } else if (result.error.includes('pending approval')) {
            setError(
              <div>
                <p>Your account is pending approval by an administrator.</p>
                <p className="mt-2 text-sm">
                  You'll be able to login after an administrator approves your account.
                </p>
              </div>
            )
          } else if (result.error.includes('rejected')) {
            setError('Your registration has been rejected')
          } else {
            setError('Invalid credentials')
          }
        } else {
          router.push('/') // Redirect to home page after successful login
          router.refresh()
        }
      } catch (error) {
        console.error('Unexpected error during login:', error)
        setError('An error occurred during login')
      }
    }

    const handleMicrosoftLogin = async () => {
      try {
        console.log('Starting Microsoft login, redirect URL will be: ' + 
                    window.location.origin + '/api/auth/callback/microsoft');
        
        await signIn('microsoft', { callbackUrl: '/' });
      } catch (error) {
        console.error('Microsoft login error:', error);
        setError('An error occurred during Microsoft login');
      }
    }

    const handleGoogleLogin = async () => {
      try {
        console.log('Starting Google login, redirect URL will be: ' + 
                    window.location.origin + '/api/auth/callback/google');
        
        await signIn('google', { callbackUrl: '/' });
      } catch (error) {
        console.error('Google login error:', error);
        setError('An error occurred during Google login');
      }
    }

    // Function to resend verification email
    const handleResendVerification = async (e: React.MouseEvent) => {
      e.preventDefault();
      
      if (!formData.email) {
        alert("Please enter your email address in the form first");
        return;
      }
      
      try {
        setResendingEmail(true);
        setResendSuccess(false);
        
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          setResendSuccess(true);
        } else {
          alert(`Error: ${result.error || 'Failed to resend verification email'}`);
        }
      } catch (error) {
        console.error('Error resending verification email:', error);
        alert('An unexpected error occurred. Please try again later.');
      } finally {
        setResendingEmail(false);
      }
    };

    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setResetStatus('loading');
      setResetMessage('');
      setEmailError(null);
      setResetData(null);

      // Validate email format
      if (!validateEmail(resetEmail)) {
        setEmailError('Please enter a valid email address');
        setResetStatus('idle');
        return;
      }

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: resetEmail }),
        });

        const data: ResetResponse = await response.json();

        if (response.ok) {
          setResetStatus(data.isOAuth ? 'oauth' : 'success');
          setResetMessage(data.message);
          setResetData(data);
          
          // Only clear email and close modal for non-OAuth users who will receive reset instructions
          if (!data.isOAuth) {
            setResetEmail('');
            setTimeout(() => setShowForgotPassword(false), 3000);
          }
        } else {
          setResetStatus('error');
          setResetMessage(data.message || 'Failed to send reset instructions');
        }
      } catch (error) {
        setResetStatus('error');
        setResetMessage('An error occurred while processing your request');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <button
                onClick={handleMicrosoftLogin}
                className="w-full bg-gray-800 text-white p-2 rounded hover:bg-gray-700 flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 23" width="18" height="18" className="mr-2">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
                Sign in with Microsoft
              </button>

              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-gray-300 p-2 rounded hover:bg-gray-50 flex items-center justify-center"
              >
                <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reset Password</h3>
              <form onSubmit={handleForgotPassword}>
                <div className="mb-4">
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    required
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      emailError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value)
                      setEmailError(null)
                      setResetStatus('idle')
                      setResetMessage('')
                    }}
                    placeholder="Enter your email address"
                  />
                  {emailError && (
                    <p className="mt-1 text-sm text-red-600">{emailError}</p>
                  )}
                </div>
                {resetMessage && (
                  <div className={`mb-4 p-3 rounded ${
                    resetStatus === 'success' 
                      ? 'bg-green-50 text-green-700'
                      : resetStatus === 'oauth'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <p>{resetMessage}</p>
                    {resetStatus === 'oauth' && resetData?.provider && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotPassword(false);
                          signIn(resetData.provider);
                        }}
                        className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Sign in with {resetData.provider.charAt(0).toUpperCase() + resetData.provider.slice(1)}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetEmail('')
                      setEmailError(null)
                      setResetStatus('idle')
                      setResetMessage('')
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetStatus === 'loading' || !resetEmail || !!emailError}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {resetStatus === 'loading' ? 'Sending...' : 'Send Reset Instructions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // This return handles any other cases, though we should never reach here
  // because of the earlier redirects
  return null
} 