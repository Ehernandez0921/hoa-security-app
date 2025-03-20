'use client';

import { useState, useEffect } from 'react';
import { MemberAddress, MemberAddressCreateParams, MemberAddressUpdateParams } from '@/app/models/member/Address';
import AddressList from '@/components/AddressList';
import AddressForm from '@/components/AddressForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function MemberAddressesPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<MemberAddress | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; softDeleted?: boolean; message?: string } | null>(null);
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Check if user is authorized (APPROVED status)
  useEffect(() => {
    async function checkAuthorization() {
      if (authStatus === 'unauthenticated') {
        router.push('/routes/login');
        return;
      }
      
      if (authStatus === 'authenticated' && session?.user?.id) {
        try {
          // Check profile status
          const { data, error } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error('Error checking profile status:', error);
            setIsAuthorized(false);
          } else if (data && data.status === 'APPROVED') {
            setIsAuthorized(true);
          } else {
            console.log('User not approved, redirecting to dashboard');
            router.push('/routes/member/dashboard');
          }
        } catch (err) {
          console.error('Unexpected error checking authorization:', err);
          setIsAuthorized(false);
        } finally {
          setAuthLoading(false);
        }
      } else if (authStatus !== 'loading') {
        setAuthLoading(false);
      }
    }
    
    checkAuthorization();
  }, [session, authStatus, router]);
  
  // Show loading while checking authorization
  if (authStatus === 'loading' || authLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }
  
  // Unauthorized users don't see the content
  if (!isAuthorized) {
    return null;
  }
  
  // Load addresses when component mounts
  useEffect(() => {
    if (authStatus === 'authenticated') {
      loadAddresses();
    }
  }, [authStatus]);
  
  // Load all addresses for the current member
  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/member/addresses');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error loading addresses');
      }
      
      const data = await response.json();
      setAddresses(data.addresses);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle adding a new address
  const handleAddAddress = async (addressData: MemberAddressCreateParams) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/member/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add address');
      }
      
      // Reset form and reload addresses
      setShowForm(false);
      loadAddresses();
    } catch (err) {
      console.error('Error adding address:', err);
      setError(err instanceof Error ? err.message : 'Error adding address');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle updating an existing address
  const handleUpdateAddress = async (addressData: MemberAddressUpdateParams) => {
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/member/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update address');
      }
      
      // Reset form and reload addresses
      setShowForm(false);
      setEditingAddress(undefined);
      loadAddresses();
    } catch (err) {
      console.error('Error updating address:', err);
      setError(err instanceof Error ? err.message : 'Error updating address');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle initiating address deletion (show confirmation dialog)
  const handleDeleteAddress = async (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteConfirmation(true);
    setDeleteResult(null);
  };
  
  // Handle actual deletion after confirmation
  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/member/addresses?id=${addressToDelete}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete address');
      }
      
      // Set the result for potential messaging
      setDeleteResult(data);
      
      // Reload addresses after deletion
      await loadAddresses();
      
      // Close the dialog after a short delay to show result
      setTimeout(() => {
        setShowDeleteConfirmation(false);
        setAddressToDelete(null);
        setDeleteResult(null);
      }, 1500);
    } catch (err) {
      console.error('Error deleting address:', err);
      setError(err instanceof Error ? err.message : 'Error deleting address');
      
      // Close the dialog after error
      setShowDeleteConfirmation(false);
      setAddressToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Cancel deletion
  const cancelDeleteAddress = () => {
    setShowDeleteConfirmation(false);
    setAddressToDelete(null);
    setDeleteResult(null);
  };
  
  // Handle edit button click
  const handleEditClick = (address: MemberAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };
  
  // Handle form submission (create or update)
  const handleFormSubmit = async (data: MemberAddressCreateParams | MemberAddressUpdateParams) => {
    if ('id' in data && data.id) {
      await handleUpdateAddress(data as MemberAddressUpdateParams);
    } else {
      await handleAddAddress(data as MemberAddressCreateParams);
    }
  };
  
  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAddress(undefined);
  };
  
  // Render loading state
  if (authStatus === 'loading' || (authStatus === 'authenticated' && loading && !error)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">My Addresses</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Address
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Custom Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              {!deleteResult ? (
                <>
                  <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
                  <p className="mb-6 text-gray-600">
                    Are you sure you want to delete this address? If the address has associated visitors, it will be deactivated instead of deleted.
                  </p>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={cancelDeleteAddress}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteAddress}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : 'Delete Address'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  {deleteResult.softDeleted ? (
                    <div className="text-orange-600 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-lg font-medium mt-2">Address Deactivated</h3>
                      <p className="mt-1 text-sm">{deleteResult.message || "The address was deactivated because it has associated visitors."}</p>
                    </div>
                  ) : (
                    <div className="text-green-600 mb-4">
                      <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 className="text-lg font-medium mt-2">Address Deleted</h3>
                      <p className="mt-1 text-sm">The address has been successfully deleted.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {showForm ? (
        <div className="mb-8">
          <AddressForm
            address={editingAddress}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-gray-600">
              Manage your addresses below. Any changes to address will require admin approval.
              Your primary address is used for communications and displays in your profile.
              The owner name is automatically set to your account name.
            </p>
          </div>
          
          <AddressList
            addresses={addresses}
            onEdit={handleEditClick}
            onDelete={handleDeleteAddress}
            onRefresh={loadAddresses}
          />
        </>
      )}
    </div>
  );
} 