'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Hero from './components/Hero';
import ParallaxSection from './components/ParallaxSection';

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
    <main>
      <Hero />
      
      <ParallaxSection
        imageUrl="/images/guard-check.jpg"
        title="Efficient Visitor Management"
        description="Streamline your visitor check-in process with our digital management system. Security guards can quickly verify visitors, check access codes, and maintain a secure log of all entries."
        altText="Security guard checking visitor"
      />
      
      <ParallaxSection
        imageUrl="/images/mobile-app.jpg"
        title="Modern Mobile Experience"
        description="Residents can easily manage visitor access through our intuitive mobile interface. Generate access codes, track visitor history, and update permissions in real-time."
        altText="Mobile app interface"
        reverse
      />
      
      <ParallaxSection
        imageUrl="/images/community.jpg"
        title="Enhanced Community Security"
        description="Protect your gated community with advanced security features. Our system helps maintain a safe environment while providing convenience for residents and their guests."
        altText="Gated community view"
      />
      
      <ParallaxSection
        imageUrl="/images/dashboard.jpg"
        title="Comprehensive Dashboard"
        description="Access detailed analytics and reports through our powerful dashboard. Monitor visitor patterns, manage multiple addresses, and ensure community safety with ease."
        altText="Security dashboard interface"
        reverse
      />
      
      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-lg mb-8">Join our community of secure gated properties today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/routes/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg 
                font-semibold transition-colors duration-200"
            >
              Login Now
            </a>
            <a
              href="/routes/register"
              className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg 
                font-semibold transition-colors duration-200"
            >
              Register
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
