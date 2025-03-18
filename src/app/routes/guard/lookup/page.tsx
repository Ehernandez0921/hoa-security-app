'use client'

import { useState, useEffect } from 'react'
import debounce from 'lodash/debounce'
import { getAddresses, getAddressDetails } from '@/lib/dataAccess'
import { VisitorInfo, AddressInfo } from '@/app/models/guard/Address'

export default function AddressLookup() {
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Debounced search function
  const debouncedSearch = debounce(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Use Supabase data instead of mock data
      const addresses = await getAddresses(searchTerm);
      setSuggestions(addresses);
    } catch (error) {
      console.error('Error searching for addresses:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch(searchInput);
    
    // Check if the current input exactly matches an address in suggestions
    // If so, load the details for that address
    if (suggestions.includes(searchInput)) {
      fetchAddressDetails(searchInput);
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchInput, suggestions]);

  // Function to fetch address details from Supabase
  const fetchAddressDetails = async (address: string) => {
    try {
      setIsLoading(true);
      const addressInfo = await getAddressDetails(address);
      if (addressInfo) {
        setSelectedAddress(addressInfo);
      }
    } catch (error) {
      console.error('Error fetching address details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAddress = async (address: string) => {
    setSearchInput(address);
    setSuggestions([]);
    await fetchAddressDetails(address);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Address Lookup</h1>
      
      <div className="relative mb-8">
        <div className="relative">
          <input
            type="text"
            className="w-full border p-2 rounded pr-10"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Start typing an address..."
          />
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && !isLoading && (
          <div className="absolute w-full bg-white border rounded-b mt-1 shadow-lg z-10">
            {suggestions.map((address, index) => (
              <div
                key={index}
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelectAddress(address)}
              >
                {address}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Address details */}
      {selectedAddress && (
        <div className="border rounded p-4 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">{selectedAddress.address}</h2>
          <h3 className="font-medium mb-2">Allowed Visitors:</h3>
          {selectedAddress.allowedVisitors && selectedAddress.allowedVisitors.length > 0 ? (
            <ul className="space-y-2">
              {selectedAddress.allowedVisitors.map((visitor, index) => (
                <li 
                  key={index} 
                  className="flex justify-between items-center border-b pb-2"
                >
                  <span className="text-gray-800">{visitor.name}</span>
                  <span className="font-mono bg-gray-100 px-3 py-1 rounded">
                    {visitor.accessCode}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No visitors allowed for this address.</p>
          )}
        </div>
      )}
    </div>
  )
} 