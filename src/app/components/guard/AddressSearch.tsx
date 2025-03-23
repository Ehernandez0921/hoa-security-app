'use client'

import { useState, useEffect, useRef } from 'react'
import debounce from 'lodash/debounce'
import { AddressSearchResult } from '@/app/models/guard/Address'

interface AddressSearchProps {
  onAddressSelect: (addressId: string, address: string, hasRegisteredAddress: boolean, addressDetails?: any) => void
}

export default function AddressSearch({ onAddressSelect }: AddressSearchProps) {
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSearchResult['addresses']>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Handle clicks outside the suggestions dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setSuggestions([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Debounced search function
  const debouncedSearch = useRef(
    debounce(async (searchTerm: string) => {
      if (searchTerm.length < 2) {
        setSuggestions([])
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      
      try {
        console.log('Sending search request for:', searchTerm)
        const response = await fetch(`/api/guard/lookup?q=${encodeURIComponent(searchTerm)}`)
        const result = await response.json()
        
        console.log('Search response:', result)
        
        if (response.ok) {
          if (result.error) {
            console.error('Error in search response:', result.error)
            setError(result.error)
            setSuggestions([])
          } else {
            console.log('Found', result.results?.length || 0, 'addresses')
            setSuggestions(result.results)
          }
        } else {
          console.error('Error response:', response.status, result.error)
          setError(result.error || 'Error searching for addresses')
          setSuggestions([])
        }
      } catch (error) {
        console.error('Error searching for addresses:', error)
        setError('Failed to search addresses. Please try again.')
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
  ).current

  // Trigger search on input change
  useEffect(() => {
    debouncedSearch(searchInput)
    
    return () => {
      debouncedSearch.cancel()
    }
  }, [searchInput, debouncedSearch])

  const handleSelectAddress = (addressId: string, address: string, isRegistered: boolean) => {
    setSearchInput(address)
    setSuggestions([])
    onAddressSelect(addressId, address, isRegistered)
  }

  // Handle address selection
  const handleAddressSelect = (result: any) => {
    onAddressSelect(
      result.id || '',
      result.address,
      result.isRegistered,
      result.details
    )
    setSearchInput('')
    setSuggestions([])
  }

  return (
    <div className="relative mb-8">
      <label htmlFor="address-search" className="block text-sm font-medium text-gray-700 mb-1">
        Search for an address:
      </label>
      <div className="relative">
        <input
          id="address-search"
          type="text"
          className="w-full border p-3 rounded-lg pr-10 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Start typing an address..."
          aria-label="Search for an address"
          autoComplete="off"
        />
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {/* Suggestions dropdown */}
      {suggestions.length > 0 && !isLoading && (
        <div 
          ref={suggestionsRef}
          className="absolute w-full bg-white border rounded-lg mt-1 shadow-lg z-10 max-h-60 overflow-y-auto"
        >
          {suggestions.map((address) => (
            <div
              key={address.id || address.address}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
              onClick={() => handleAddressSelect(address)}
            >
              <div className="font-medium text-gray-800">
                {address.address}
                {address.apartment_number && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                    Apt {address.apartment_number}
                  </span>
                )}
                {!address.isRegistered && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                    Unregistered
                  </span>
                )}
              </div>
              {address.owner_name && (
                <div className="text-sm text-gray-500">
                  Owner: {address.owner_name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* No results message */}
      {searchInput.length >= 2 && !isLoading && suggestions.length === 0 && !error && (
        <div className="mt-2 text-sm text-gray-600">
          No addresses found matching your search. Try a different search term.
        </div>
      )}
    </div>
  )
} 