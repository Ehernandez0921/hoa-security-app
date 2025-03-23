'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 3) {
        setSuggestions([])
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)
      
      try {
        console.log('Fetching addresses for query:', query)
        const response = await fetch(
          `/api/guard/lookup?q=${encodeURIComponent(query)}&include_unregistered=true`
        )
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API error:', errorText)
          throw new Error(`API error: ${errorText}`)
        }

        const data = await response.json()
        console.log('Search results:', data)

        setSuggestions(data.results || [])
      } catch (error) {
        console.error('Error searching addresses:', error)
        setError(error instanceof Error ? error.message : 'Failed to search addresses')
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

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
  const handleAddressSelect = (address: AddressSearchResult['addresses'][0]) => {
    console.log('Address selected:', address)
    setSearchInput(address.address)
    setSuggestions([])
    onAddressSelect(
      address.id || '',
      address.address,
      address.isRegistered,
      address.details
    )
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
          onChange={(e) => {
            const value = e.target.value
            console.log('Input changed:', value)
            setSearchInput(value)
            setError('')
            debouncedSearch(value)
          }}
          onFocus={(e) => e.target.select()}
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
      {searchInput.length >= 3 && !isLoading && suggestions.length === 0 && !error && (
        <div className="mt-2 text-sm text-gray-600">
          No addresses found matching your search. Try a different search term.
        </div>
      )}
    </div>
  )
} 