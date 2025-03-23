'use client'

import { useState } from 'react'
import { VisitorInfo } from '@/app/models/guard/Address'

interface VisitorListProps {
  visitors: VisitorInfo[]
  addressId: string
  onVisitorCheckedIn: (visitorId?: string) => void
}

export default function VisitorList({ visitors, addressId, onVisitorCheckedIn }: VisitorListProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [checkingInVisitorId, setCheckingInVisitorId] = useState<string | null>(null)

  // Debug logging
  console.log('Raw visitors:', visitors)

  // Filter to show only active visitors
  const activeVisitors = visitors.filter(visitor => visitor.is_active)
  console.log('Active visitors:', activeVisitors)
  
  // Separate visitors into named and code-only categories
  const namedVisitors = activeVisitors.filter(visitor => visitor.is_named_visitor)
  // Show all visitors that have an access code, regardless of named status
  const codeVisitors = activeVisitors.filter(visitor => visitor.accessCode)
  
  console.log('Named visitors:', namedVisitors)
  console.log('Code visitors:', codeVisitors)

  // Handle visitor check-in
  const handleCheckIn = async (visitorId: string, isNamedVisitor: boolean) => {
    setCheckingInVisitorId(visitorId)
    setError(null)
    try {
      const response = await fetch('/api/guard/visitors/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitor_id: visitorId,
          address_id: addressId,
          entry_method: isNamedVisitor ? 'NAME_VERIFICATION' : 'ACCESS_CODE'
        }),
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setSuccessMessage('Visitor checked in successfully!')
        onVisitorCheckedIn(visitorId)
      } else {
        setError(result.error || 'Failed to check in visitor')
      }
    } catch (error) {
      console.error('Error checking in visitor:', error)
      setError('An unexpected error occurred')
    } finally {
      setCheckingInVisitorId(null)
    }
  }

  // Format date from ISO string to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Named Visitors Section */}
      {namedVisitors.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-blue-500 text-white px-4 py-2 font-medium">
            Named Visitors ({namedVisitors.length})
          </div>
          <div className="divide-y divide-gray-200">
            {namedVisitors.map(visitor => (
              <div key={visitor.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {visitor.first_name} {visitor.last_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Expires: {formatDate(visitor.expires_at)}
                    </p>
                    {visitor.last_used && (
                      <p className="text-sm text-gray-500">
                        Last used: {formatDate(visitor.last_used)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCheckIn(visitor.id, true)}
                    disabled={checkingInVisitorId === visitor.id}
                    className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      checkingInVisitorId === visitor.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {checkingInVisitorId === visitor.id ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking In
                      </span>
                    ) : 'Check In'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Access Code Visitors Section */}
      {codeVisitors.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-purple-500 text-white px-4 py-2 font-medium">
            Access Codes ({codeVisitors.length})
          </div>
          <div className="divide-y divide-gray-200">
            {codeVisitors.map(visitor => (
              <div key={visitor.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded text-lg font-medium text-gray-900">
                      {visitor.accessCode}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Expires: {formatDate(visitor.expires_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCheckIn(visitor.id, false)}
                    disabled={checkingInVisitorId === visitor.id}
                    className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                      checkingInVisitorId === visitor.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-purple-500 hover:bg-purple-600'
                    }`}
                  >
                    {checkingInVisitorId === visitor.id ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking In
                      </span>
                    ) : 'Check In'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 