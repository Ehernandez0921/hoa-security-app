'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useRef } from 'react'
import { getAuthProvider, getSupabaseProfile, updateUserProfile } from '@/lib/session'

// Address suggestion type
interface AddressSuggestion {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function UserProfileInfo() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [address, setAddress] = useState('')
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [originalAddress, setOriginalAddress] = useState('')
  
  // Address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{
    fullAddress: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }>>([]);
  const [addressAttribution, setAddressAttribution] = useState<string>('');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Function to handle address input changes
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);
    
    // Debounce the suggestion fetch to avoid too many requests
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 300);
  };

  // Function to select address from suggestions
  const handleSelectAddress = (suggestion: any) => {
    setAddress(suggestion.fullAddress);
    setShowSuggestions(false);
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

  useEffect(() => {
    async function loadProfile() {
      if (status === 'authenticated' && session) {
        setLoading(true)
        try {
          console.log('Session details:', {
            userId: session.user?.id,
            email: session.user?.email,
            name: session.user?.name,
            role: session.user?.role
          })
          
          if (!session.user) {
            console.error('User missing from session');
            setLoading(false);
            return;
          }
          
          // Email is required for identification if ID is missing
          if (!session.user.id && !session.user.email) {
            console.error('User ID and email missing from session - cannot identify user');
            setLoading(false);
            return;
          }
          
          console.log('Loading profile for user email:', session.user.email)
          const supabaseProfile = await getSupabaseProfile(session)
          console.log('Loaded Supabase profile:', supabaseProfile)
          
          if (supabaseProfile) {
            setProfile(supabaseProfile)
            setAddress(supabaseProfile.address || '')
            setOriginalAddress(supabaseProfile.address || '')
          } else {
            console.warn('No profile data returned from Supabase');
            
            // Create a more accurate default profile object
            const defaultProfile = { 
              id: 'pending', 
              name: session.user.name || 'Unknown',
              email: session.user.email,
              role: session.user.role || 'MEMBER',
              status: 'PENDING',
              address: '',
              updated_at: new Date().toISOString() 
            };
            
            console.log('Using default profile:', defaultProfile);
            setProfile(defaultProfile);
          }
        } catch (error) {
          console.error('Error loading profile:', error)
        } finally {
          setLoading(false)
        }
      } else if (status === 'unauthenticated') {
        console.log('User is not authenticated');
        setLoading(false)
      }
    }

    loadProfile()
  }, [session, status])

  const handleConfirmSaveAddress = () => {
    setShowConfirmation(true)
  }

  const handleCancelConfirmation = () => {
    setShowConfirmation(false)
  }

  const handleSaveAddress = async () => {
    if (!session) {
      setUpdateMessage({ type: 'error', text: 'No active session found. Please refresh the page and try again.' });
      return;
    }
    
    if (!session.user) {
      setUpdateMessage({ type: 'error', text: 'User information missing from session. Please log out and log in again.' });
      return;
    }
    
    // Email is required for identification if ID is missing
    if (!session.user.id && !session.user.email) {
      setUpdateMessage({ type: 'error', text: 'Unable to identify your account. Please contact support.' });
      return;
    }
    
    setShowConfirmation(false)
    setUpdateLoading(true)
    setUpdateMessage(null)
    
    try {
      // Log session info for debugging
      console.log('Saving with session:', { 
        userId: session.user?.id,
        email: session.user?.email,
        hasSession: !!session
      });
      
      const result = await updateUserProfile(session, { address })
      
      if (result.success) {
        setProfile({ ...profile, address, updated_at: new Date().toISOString() })
        setIsEditing(false)
        setOriginalAddress(address)
        setUpdateMessage({ type: 'success', text: 'Address updated successfully!' })
      } else {
        console.error('Update error details:', result);
        setUpdateMessage({ type: 'error', text: `Failed to update address: ${result.error}` })
      }
    } catch (error) {
      console.error('Error updating address:', error)
      setUpdateMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setUpdateLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-4 border rounded shadow-sm">Loading profile...</div>
  }

  if (status === 'unauthenticated') {
    return (
      <div className="p-4 border rounded shadow-sm">
        <p>Please log in to view your profile</p>
      </div>
    )
  }

  const authProvider = getAuthProvider(session)

  console.log('Rendering profile:', profile)

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Authentication Method</p>
        <p className="font-medium">
          {authProvider === 'microsoft' ? 'Microsoft Account' : 'Email & Password'}
        </p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Email</p>
        <p className="font-medium">{session?.user?.email}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Name</p>
        <p className="font-medium">{session?.user?.name}</p>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500">Role</p>
        <p className="font-medium">{session?.user?.role || 'No role assigned'}</p>
      </div>
      
      <h3 className="text-lg font-semibold mt-6 mb-2">Address Information</h3>
          
      <div className="mb-4">
        <p className="text-sm text-gray-500">Address</p>
        {isEditing ? (
          <div className="mt-1">
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={address}
                onChange={handleAddressChange}
                onFocus={() => {
                  if (address && address.length >= 3) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicks
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Start typing your address for suggestions"
              />
              
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
                  ) : address && address.length >= 3 ? (
                    <div className="p-2 text-center text-sm text-gray-500">
                      No suggestions found
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            
            <div className="mt-2 flex space-x-2">
              <button
                onClick={handleConfirmSaveAddress}
                disabled={updateLoading || address === originalAddress}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300"
              >
                {updateLoading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setAddress(originalAddress)
                }}
                disabled={updateLoading}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="font-medium">{address || 'No address provided'}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              Edit
            </button>
          </div>
        )}
      </div>
      
      {updateMessage && (
        <div className={`p-2 mb-4 rounded ${updateMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {updateMessage.text}
        </div>
      )}
      
      {profile && (
        <div className="text-xs text-gray-400 mt-4">
          <p>Profile ID: {profile.id}</p>
          <p>Last updated: {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : 'Never'}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Address Change</h3>
            <p className="mb-4">Are you sure you want to update your address from:</p>
            <p className="font-semibold mb-2 text-gray-700">{originalAddress || 'No address'}</p>
            <p className="mb-2">to:</p>
            <p className="font-semibold mb-4 text-gray-700">{address}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelConfirmation}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 