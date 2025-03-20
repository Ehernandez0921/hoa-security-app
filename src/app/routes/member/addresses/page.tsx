'use client';

import { useState, useEffect } from 'react';
import { MemberAddress, MemberAddressCreateParams, MemberAddressUpdateParams } from '@/app/models/member/Address';
import AddressList from '@/components/AddressList';
import AddressForm from '@/components/AddressForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function MemberAddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<MemberAddress | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is authenticated and has required role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/routes/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'MEMBER') {
      router.push('/');
    }
  }, [status, session, router]);
  
  // Load addresses when component mounts
  useEffect(() => {
    if (status === 'authenticated') {
      loadAddresses();
    }
  }, [status]);
  
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
  
  // Handle deleting an address
  const handleDeleteAddress = async (addressId: string) => {
    try {
      const response = await fetch(`/api/member/addresses?id=${addressId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete address');
      }
      
      // Reload addresses
      loadAddresses();
    } catch (err) {
      console.error('Error deleting address:', err);
      setError(err instanceof Error ? err.message : 'Error deleting address');
    }
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
  if (status === 'loading' || (status === 'authenticated' && loading && !error)) {
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