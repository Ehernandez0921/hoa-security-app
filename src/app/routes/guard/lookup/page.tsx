'use client'

import { useState } from 'react'
import { AddressInfo } from '@/app/models/guard/Address'
import AddressSearch from '@/app/components/guard/AddressSearch'
import VisitorList from '@/app/components/guard/VisitorList'
import NonRegisteredVisitorForm from '@/app/components/guard/NonRegisteredVisitorForm'

export default function AddressLookup() {
  const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRegisteredAddress, setHasRegisteredAddress] = useState(false)
  
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
  const handleAddressSelect = async (addressId: string, address: string, isRegistered: boolean, addressDetails?: any) => {
    console.log('Address selected:', { addressId, address, isRegistered, addressDetails });
    setHasRegisteredAddress(isRegistered);
    
    if (isRegistered && addressId) {
      await fetchAddressDetails(addressId);
    } else {
      setSelectedAddress({
        id: null,
        address: address,
        owner_name: '',
        member_id: '',
        allowedVisitors: [],
        addressDetails: addressDetails,
        isRegistered: false
      });
    }
  }

  // Handle visitor check-in
  const handleVisitorCheckedIn = (visitorId?: string) => {
    // Update local state to reflect the check-in
    if (selectedAddress && visitorId) {
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

      {/* Address Details and Content */}
      {selectedAddress && !isLoading && (
        <div className="mt-8">
          {/* Address Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              {selectedAddress.address}
            </h2>
            {selectedAddress.apartment_number && (
              <div className="text-lg text-gray-600 mb-2">
                Apartment: <span className="font-medium">{selectedAddress.apartment_number}</span>
              </div>
            )}
            {selectedAddress.owner_name && (
              <div className="text-gray-600">
                Owner: <span className="font-medium">{selectedAddress.owner_name}</span>
              </div>
            )}
          </div>

          {/* Visitor List - Only for registered addresses */}
          {hasRegisteredAddress && selectedAddress.id && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Visitor Access</h3>
              {selectedAddress.allowedVisitors?.length > 0 ? (
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

          {/* Non-Registered Visitor Check-In Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-orange-500 text-white px-4 py-2 font-medium flex items-center">
              <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              Non-Registered Visitor Check-In
            </div>
            
            {/* Warning message only for unregistered addresses */}
            {!hasRegisteredAddress && (
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">
                      Unregistered Address
                    </h3>
                    <div className="mt-2 text-sm text-orange-700">
                      <p>This address is not registered in our system. Only non-registered visitor check-ins are available.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Non-Registered Visitor Form */}
            <div className="p-6">
              <NonRegisteredVisitorForm 
                addressId={hasRegisteredAddress ? selectedAddress.id : null}
                address={!hasRegisteredAddress ? selectedAddress.address : undefined}
                addressDetails={!hasRegisteredAddress ? selectedAddress.addressDetails : undefined}
                onVisitorCheckedIn={handleVisitorCheckedIn}
              />
            </div>
          </div>
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