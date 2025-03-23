'use client'

import { useState } from 'react'
import { VisitorInfo } from '@/app/models/guard/Address'
import NonRegisteredVisitorForm from './NonRegisteredVisitorForm'

interface VisitorListProps {
  visitors: VisitorInfo[]
  addressId: string
  onVisitorCheckedIn: (visitorId?: string) => void
}

export default function VisitorList({ visitors, addressId, onVisitorCheckedIn }: VisitorListProps) {
  const [codeInput, setCodeInput] = useState('')
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; message: string } | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [checkingInVisitorId, setCheckingInVisitorId] = useState<string | null>(null)

  // Filter to show only active visitors
  const activeVisitors = visitors.filter(visitor => visitor.is_active)
  
  // Separate visitors into named and code-only categories
  const namedVisitors = activeVisitors.filter(visitor => visitor.is_named_visitor)
  const codeVisitors = activeVisitors.filter(visitor => !visitor.is_named_visitor)

  // Handle visitor check-in
  const handleCheckIn = async (visitorId: string, isNamedVisitor: boolean) => {
    setCheckingInVisitorId(visitorId)
    try {
      const response = await fetch('/api/guard/visitors/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitor_id: visitorId,
          address_id: addressId,
          entry_method: isNamedVisitor ? 'NAME_VERIFICATION' : 'ACCESS_CODE',
          notes: '' // Optional notes could be added here if the UI supported it
        }),
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        onVisitorCheckedIn(visitorId)
      } else {
        console.error('Error checking in visitor:', result.error)
      }
    } catch (error) {
      console.error('Error checking in visitor:', error)
    } finally {
      setCheckingInVisitorId(null)
    }
  }

  // Handle access code verification
  const handleVerifyCode = async () => {
    if (!codeInput.trim()) return
    
    setIsVerifying(true)
    setVerificationResult(null)
    
    try {
      const response = await fetch('/api/guard/visitors/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_code: codeInput.trim(),
          address_id: addressId
        }),
      })
      
      const result = await response.json()
      
      if (response.ok) {
        if (result.valid && result.visitor) {
          setVerificationResult({
            valid: true,
            message: `Valid access code for ${result.visitor.is_named_visitor 
              ? `${result.visitor.first_name} ${result.visitor.last_name}` 
              : 'Anonymous Visitor'}`
          })
        } else {
          setVerificationResult({
            valid: false,
            message: result.error || 'Invalid access code for this address.'
          })
        }
      } else {
        setVerificationResult({
          valid: false,
          message: result.error || 'Error verifying code. Please try again.'
        })
      }
    } catch (error) {
      console.error('Error verifying access code:', error)
      setVerificationResult({
        valid: false,
        message: 'Error verifying code. Please try again.'
      })
    } finally {
      setIsVerifying(false)
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

  // Check if a visitor is expired
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Named Visitors Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-blue-600 text-white px-4 py-2 font-medium">
          Named Visitors ({namedVisitors.length})
        </div>
        {namedVisitors.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {namedVisitors.map((visitor) => (
              <li key={visitor.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">
                    {visitor.first_name} {visitor.last_name}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span 
                      className={`px-2 py-1 text-xs rounded-full ${
                        isExpired(visitor.expires_at) 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {isExpired(visitor.expires_at) ? 'Expired' : 'Active'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Expires: {formatDate(visitor.expires_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCheckIn(visitor.id, true)}
                  disabled={checkingInVisitorId === visitor.id || isExpired(visitor.expires_at)}
                  className={`mt-2 sm:mt-0 px-4 py-2 rounded text-white ${
                    checkingInVisitorId === visitor.id
                      ? 'bg-gray-400'
                      : isExpired(visitor.expires_at)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {checkingInVisitorId === visitor.id ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  ) : 'Check In'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-gray-500 text-center">No named visitors for this address.</div>
        )}
      </div>

      {/* Access Code Visitors Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-purple-600 text-white px-4 py-2 font-medium">
          Access Code Visitors ({codeVisitors.length})
        </div>
        {codeVisitors.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {codeVisitors.map((visitor) => (
              <li key={visitor.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1">
                  <div className="font-mono bg-gray-100 px-3 py-1 rounded inline-block">
                    {visitor.accessCode}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span 
                      className={`px-2 py-1 text-xs rounded-full ${
                        isExpired(visitor.expires_at) 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {isExpired(visitor.expires_at) ? 'Expired' : 'Active'}
                    </span>
                    <span className="text-sm text-gray-500">
                      Expires: {formatDate(visitor.expires_at)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCheckIn(visitor.id, false)}
                  disabled={checkingInVisitorId === visitor.id || isExpired(visitor.expires_at)}
                  className={`mt-2 sm:mt-0 px-4 py-2 rounded text-white ${
                    checkingInVisitorId === visitor.id
                      ? 'bg-gray-400'
                      : isExpired(visitor.expires_at)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {checkingInVisitorId === visitor.id ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing
                    </span>
                  ) : 'Check In'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-gray-500 text-center">No access code visitors for this address.</div>
        )}
      </div>

      {/* Access Code Verification Section */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-medium mb-3">Verify Access Code</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Enter access code"
            maxLength={6}
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleVerifyCode}
            disabled={isVerifying || !codeInput.trim()}
            className={`px-4 py-2 rounded text-white ${
              isVerifying || !codeInput.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isVerifying ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying
              </span>
            ) : 'Verify'}
          </button>
        </div>
        
        {verificationResult && (
          <div className={`mt-3 p-3 rounded ${
            verificationResult.valid
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {verificationResult.message}
          </div>
        )}
      </div>

      {/* Warning Section */}
      <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-400">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Non-Registered Visitor Check-In
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>This option should only be used when the visitor is not in the registered visitors list. All non-registered check-ins are logged for security purposes.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Non-Registered Visitor Form - Now at the bottom with warning colors */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-orange-500 text-white px-4 py-2 font-medium flex items-center">
          <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Non-Registered Visitor Check-In
        </div>
        <NonRegisteredVisitorForm 
          addressId={addressId}
          onVisitorCheckedIn={() => onVisitorCheckedIn()}
        />
      </div>
    </div>
  )
} 