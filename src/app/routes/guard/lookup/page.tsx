'use client'

import { useState } from 'react'
import { AddressInfo } from '@/app/models/guard/Address'
import AddressSearch from '@/app/components/guard/AddressSearch'
import VisitorList from '@/app/components/guard/VisitorList'

export default function AddressLookup() {
  const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Function to fetch address details from API
  const fetchAddressDetails = async (addressId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/guard/addresses/details?id=${encodeURIComponent(addressId)}`)
      const result = await response.json()
      
      if (response.ok) {
        setSelectedAddress(result)
      } else {
        setError(result.error || 'Could not load address details. Please try again.')
      }
    } catch (error) {
      console.error('Error fetching address details:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle address selection from the search component
  const handleAddressSelect = async (addressId: string, address: string) => {
    await fetchAddressDetails(addressId)
  }

  // Handle visitor check-in
  const handleVisitorCheckedIn = (visitorId: string) => {
    // Update local state to reflect the check-in
    if (selectedAddress) {
      setSelectedAddress({
        ...selectedAddress,
        allowedVisitors: selectedAddress.allowedVisitors.map(visitor => 
          visitor.id === visitorId 
            ? { ...visitor, last_used: new Date().toISOString() } 
            : visitor
        )
      })
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Address Lookup</h1>
      
      {/* Address Search Component */}
      <AddressSearch onAddressSelect={handleAddressSelect} />
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {/* Error Message */}
      {error && !isLoading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Address Details */}
      {selectedAddress && !isLoading && (
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {selectedAddress.address}
            </h2>
            {selectedAddress.apartment_number && (
              <div className="text-lg text-gray-600 mb-2">
                Apartment: <span className="font-medium">{selectedAddress.apartment_number}</span>
              </div>
            )}
            <div className="text-gray-600">
              Owner: <span className="font-medium">{selectedAddress.owner_name}</span>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Visitor Access</h3>
          
          {/* Show visitor list if there are visitors, or a message if none */}
          {selectedAddress.allowedVisitors.length > 0 ? (
            <VisitorList 
              visitors={selectedAddress.allowedVisitors} 
              addressId={selectedAddress.id}
              onVisitorCheckedIn={handleVisitorCheckedIn}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              <p className="text-lg">No active visitors for this address.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Initial State - No Address Selected */}
      {!selectedAddress && !isLoading && !error && (
        <div className="bg-blue-50 rounded-lg p-8 text-center mt-12">
          <p className="text-lg text-blue-800">
            Enter an address above to see allowed visitors.
          </p>
        </div>
      )}
    </div>
  )
} 