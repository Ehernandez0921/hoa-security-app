'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { MemberAddress, MemberAddressCreateParams, MemberAddressUpdateParams } from '@/app/models/member/Address';

// Address suggestion type
interface AddressSuggestion {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

interface AddressFormProps {
  address?: MemberAddress;
  onSubmit: (data: MemberAddressCreateParams | MemberAddressUpdateParams) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function AddressForm({
  address,
  onSubmit,
  onCancel,
  isSubmitting
}: AddressFormProps) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState<MemberAddressCreateParams | MemberAddressUpdateParams>({
    id: address?.id || '',
    address: address?.address || '',
    apartment_number: address?.apartment_number || '',
    owner_name: address?.owner_name || session?.user?.name || '',
    is_primary: address?.is_primary || false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Address validation states
  const [isAddressValid, setIsAddressValid] = useState<boolean>(!!address); // Assume existing addresses are valid
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [addressSelectedFromSuggestions, setAddressSelectedFromSuggestions] = useState<boolean>(!!address);
  
  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressAttribution, setAddressAttribution] = useState<string>('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update form when address prop changes
  useEffect(() => {
    if (address) {
      setFormData({
        id: address.id,
        address: address.address,
        apartment_number: address.apartment_number || '',
        owner_name: address.owner_name,
        is_primary: address.is_primary
      });
      setIsAddressValid(true);
      setAddressSelectedFromSuggestions(true);
    } else {
      setFormData({
        address: '',
        apartment_number: '',
        owner_name: session?.user?.name || '',
        is_primary: false
      });
      setIsAddressValid(false);
      setAddressSelectedFromSuggestions(false);
    }
  }, [address, session]);

  // Function to fetch address suggestions
  const fetchAddressSuggestions = async (addressText: string) => {
    if (!addressText || addressText.length < 3) {
      setAddressSuggestions([]);
      setAddressAttribution('');
      setShowSuggestions(false);
      return;
    }
    
    setIsLoadingSuggestions(true);
    setShowSuggestions(true);
    
    try {
      const response = await fetch(`/api/address-lookup?q=${encodeURIComponent(addressText)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch address suggestions');
      }
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setAddressSuggestions(data.suggestions);
        if (data.attribution) {
          setAddressAttribution(data.attribution);
        }
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Validate address with OpenStreetMap API
  const validateAddress = async (addressText: string): Promise<boolean> => {
    if (!addressText || addressText.length < 5) { // Increased minimum length
      return false;
    }
    
    setIsValidating(true);
    
    try {
      const response = await fetch(`/api/address-lookup?q=${encodeURIComponent(addressText)}`);
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      
      if (data.error) {
        return false;
      }
      
      // Require the input to have some structure of a real address
      // Simple check: At least have a number followed by some text
      const hasAddressStructure = /\d+\s+\w+/.test(addressText.trim());
      if (!hasAddressStructure && !addressSelectedFromSuggestions) {
        return false;
      }
      
      // Address is valid if we get at least one suggestion that closely matches
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        // Check if any suggestion closely matches our address text
        const normalizedInput = addressText.toLowerCase().replace(/\s+/g, ' ').trim();
        
        // Split the normalized input into parts for better partial matching
        const inputParts = normalizedInput.split(/[\s,]+/).filter(part => part.length > 1);
        if (inputParts.length < 2 && !addressSelectedFromSuggestions) {
          return false; // Require at least 2 meaningful parts in the address
        }
        
        for (const suggestion of data.suggestions) {
          const normalizedSuggestion = suggestion.fullAddress.toLowerCase().replace(/\s+/g, ' ').trim();
          
          // Don't allow input that's just a tiny substring of the suggestion
          if (normalizedInput.length < 5 && normalizedSuggestion.includes(normalizedInput)) {
            continue;
          }
          
          // Calculate what percentage of the suggestion matches the input
          const matchPercentage = calculateMatchPercentage(normalizedInput, normalizedSuggestion);
          
          // For short inputs, require more precision
          const requiredMatchPercentage = normalizedInput.length < 10 ? 0.6 : 0.4;
          
          // If addresses are similar enough, consider it valid
          if (matchPercentage > requiredMatchPercentage || 
              // For Levenshtein, make the threshold proportional to input length
              levenshteinDistance(normalizedInput, normalizedSuggestion) < Math.min(5, normalizedInput.length / 3)) {
            return true;
          }
          
          // Check for strong partial matches
          // Count how many significant parts of the input are in the suggestion
          const matchingParts = inputParts.filter(part => 
            part.length > 2 && normalizedSuggestion.includes(part)
          );
          
          // If most parts match and we have enough parts, it's probably valid
          if (matchingParts.length >= Math.max(2, inputParts.length * 0.7)) {
            return true;
          }
        }
      }
      
      return addressSelectedFromSuggestions; // Only valid if explicitly selected from suggestions
    } catch (error) {
      console.error('Error validating address:', error);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Calculate what percentage of words from string a match string b
  const calculateMatchPercentage = (a: string, b: string): number => {
    const aWords = new Set(a.split(/[\s,]+/).filter(word => word.length > 1));
    const bWords = b.split(/[\s,]+/).filter(word => word.length > 1);
    
    let matchCount = 0;
    for (const word of bWords) {
      if (aWords.has(word)) {
        matchCount++;
      }
    }
    
    return aWords.size > 0 ? matchCount / aWords.size : 0;
  };

  // Simple implementation of Levenshtein distance for string similarity
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    return matrix[a.length][b.length];
  };

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Handle address input for autocomplete
    if (name === 'address') {
      // Set address as unvalidated when manually edited
      setIsAddressValid(false);
      setAddressSelectedFromSuggestions(false);
      
      // Debounce the suggestion fetch to avoid too many requests
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        fetchAddressSuggestions(value);
      }, 300);
      
      // Debounce the address validation as well
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      validationTimeoutRef.current = setTimeout(async () => {
        const isValid = await validateAddress(value);
        setIsAddressValid(isValid);
      }, 800);
    }
  };

  // Function to select address from suggestions
  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion.fullAddress
    }));
    setShowSuggestions(false);
    setIsAddressValid(true);
    setAddressSelectedFromSuggestions(true);
    
    // Clear any address errors
    if (errors.address) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.address;
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    } else if (!isAddressValid && !addressSelectedFromSuggestions) {
      newErrors.address = 'Please select a valid address from the suggestions';
    }
    
    // Ensure owner_name is set even if not displayed
    if (!formData.owner_name?.trim()) {
      setFormData(prev => ({
        ...prev,
        owner_name: session?.user?.name || 'Member'
      }));
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-medium mb-6">
        {address ? 'Edit Address' : 'Add New Address'}
      </h2>
      
      {/* Address field */}
      <div className="mb-4">
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Start typing your address for suggestions"
              onFocus={() => {
                if (formData.address && formData.address.length >= 3) {
                  setShowSuggestions(true);
                }
              }}
              className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.address 
                  ? 'border-red-300 focus:ring-red-500' 
                  : isAddressValid
                    ? 'border-green-300 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {/* Status indicators */}
            {isValidating ? (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : isAddressValid ? (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            ) : formData.address ? (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            ) : null}
          </div>
          
          {/* Address suggestions dropdown */}
          {showSuggestions && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              {isLoadingSuggestions ? (
                <div className="p-2 text-center text-sm text-gray-500">
                  Loading suggestions...
                </div>
              ) : addressSuggestions.length > 0 ? (
                <div>
                  <ul className="max-h-60 overflow-auto">
                    {addressSuggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSelectAddress(suggestion)}
                      >
                        {suggestion.fullAddress}
                      </li>
                    ))}
                  </ul>
                  {addressAttribution && (
                    <div className="text-xs text-gray-500 p-1 border-t">
                      {addressAttribution}
                    </div>
                  )}
                </div>
              ) : formData.address && formData.address.length >= 3 ? (
                <div className="p-2 text-center text-sm text-gray-500">
                  No suggestions found
                </div>
              ) : null}
            </div>
          )}
        </div>
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
        )}
        {!errors.address && !isAddressValid && formData.address && (
          <p className="mt-1 text-sm text-yellow-600">
            {formData.address.length < 5 ? 
              "Address is too short. Please provide a complete address." :
              !/\d+\s+\w+/.test(formData.address.trim()) ?
                "Address should include a street number and name." :
                "Please select a valid address from the suggestions or enter a complete street address."
            }
          </p>
        )}
        {address && (
          <p className="mt-1 text-xs text-gray-500">
            Changing the address will require admin approval.
          </p>
        )}
        {!address && (
          <p className="mt-1 text-xs text-gray-500">
            Enter a complete street address (e.g., "123 Main St, City, State").
          </p>
        )}
      </div>
      
      {/* Apartment Number field */}
      <div className="mb-4">
        <label htmlFor="apartment_number" className="block text-sm font-medium text-gray-700 mb-1">
          Apartment/Unit Number
        </label>
        <input
          type="text"
          id="apartment_number"
          name="apartment_number"
          value={formData.apartment_number || ''}
          onChange={handleInputChange}
          placeholder="Apt, Suite, Unit, etc. (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter your apartment, suite, or unit number if applicable.
        </p>
      </div>
      
      {/* Primary address checkbox */}
      <div className="mb-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_primary"
            name="is_primary"
            checked={formData.is_primary}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-700">
            Set as primary address
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Your primary address is used for all default communications.
        </p>
      </div>
      
      {/* Form actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (!isAddressValid && !addressSelectedFromSuggestions && !!formData.address && formData.address.trim() !== '')}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : address ? 'Update Address' : 'Add Address'}
        </button>
      </div>
    </form>
  );
} 