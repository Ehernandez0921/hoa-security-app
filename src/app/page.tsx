'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function Home() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated') {
      console.log('User role:', session?.user?.role);
      
      // Redirect based on user role
      if (session?.user?.role === 'SYSTEM_ADMIN') {
        router.push('/routes/admin')
      } else if (session?.user?.role === 'MEMBER') {
        router.push('/routes/member/dashboard')
      } else if (session?.user?.role === 'SECURITY_GUARD') {
        router.push('/routes/guard/lookup')
      }
    }
  }, [status, session, router])

  // Simple home page if not redirected
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl font-bold mb-6">Gate Security App</h1>
      <p className="text-xl mb-8">Welcome to the HOA Gate Security Application</p>
      
      {status === 'loading' && (
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      )}
      
      {status === 'unauthenticated' && (
        <div className="flex space-x-4">
          <a 
            href="/routes/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
          >
            Login
          </a>
          <a 
            href="/routes/register" 
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
          >
            Register
          </a>
        </div>
      )}
    </div>
  )
}
