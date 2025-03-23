'use client'

import { useState } from 'react'

interface NonRegisteredVisitorFormProps {
  addressId: string
  onVisitorCheckedIn: () => void
}

export default function NonRegisteredVisitorForm({ addressId, onVisitorCheckedIn }: NonRegisteredVisitorFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/guard/visitors/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address_id: addressId,
          first_name: firstName,
          last_name: lastName,
          entry_method: 'NAME_VERIFICATION',
          notes: notes
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Clear form
        setFirstName('')
        setLastName('')
        setNotes('')
        onVisitorCheckedIn()
      } else {
        setError(result.error || 'Failed to check in visitor')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="firstName" className="block mb-2 text-sm font-medium text-gray-900">
          First Name
        </label>
        <input
          type="text"
          id="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 text-base rounded border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="lastName" className="block mb-2 text-sm font-medium text-gray-900">
          Last Name
        </label>
        <input
          type="text"
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 text-base rounded border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
        />
      </div>

      <div>
        <label htmlFor="notes" className="block mb-2 text-sm font-medium text-gray-900">
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full px-3 py-2 text-base rounded border-orange-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="Enter any relevant information about the visitor or reason for visit"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 rounded text-white ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing
            </span>
          ) : 'Check In'}
        </button>
      </div>
    </form>
  )
} 