'use client'

import { useState, useEffect } from 'react'
import debounce from 'lodash/debounce'

interface VisitorInfo {
  name: string;
  accessCode: string;
}

interface AddressInfo {
  address: string;
  allowedVisitors: VisitorInfo[];
}

// Mock data - replace with API data in production
const mockAddresses: AddressInfo[] = [
  {
    address: "123 Oak Street",
    allowedVisitors: [
      { name: "John Doe", accessCode: "1234" },
      { name: "Jane Smith", accessCode: "5678" }
    ]
  },
  {
    address: "456 Maple Avenue",
    allowedVisitors: [
      { name: "Alice Johnson", accessCode: "4321" },
      { name: "Bob Wilson", accessCode: "8765" }
    ]
  },
  // Add more mock addresses as needed
];

export default function AddressLookup() {
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null)

  // Debounced search function
  const debouncedSearch = debounce((searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    // Filter addresses that match the search term
    const matches = mockAddresses
      .map(info => info.address)
      .filter(address => 
        address.toLowerCase().includes(searchTerm.toLowerCase())
      );

    setSuggestions(matches);
  }, 300);

  useEffect(() => {
    debouncedSearch(searchInput);
    
    // If exact match is found, show the details
    const exactMatch = mockAddresses.find(
      info => info.address.toLowerCase() === searchInput.toLowerCase()
    );
    if (exactMatch) {
      setSelectedAddress(exactMatch);
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [searchInput]);

  const handleSelectAddress = (address: string) => {
    setSearchInput(address);
    setSuggestions([]);
    const addressInfo = mockAddresses.find(info => info.address === address);
    if (addressInfo) {
      setSelectedAddress(addressInfo);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Address Lookup</h1>
      
      <div className="relative mb-8">
        <input
          type="text"
          className="w-full border p-2 rounded"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Start typing an address..."
        />
        
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
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
        </div>
      )}
    </div>
  )
} 