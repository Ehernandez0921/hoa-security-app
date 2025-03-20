'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { MemberAddress } from '@/app/models/member/Address';
import { Spinner } from '@/components/ui/Spinner';
import AddressMapView from '@/components/admin/AddressMapView';
import AddressVerificationDetails from '@/components/admin/AddressVerificationDetails';

export default function AdminAddressDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const addressId = params.id as string;
  
  const [address, setAddress] = useState<MemberAddress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user is authenticated and has required role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'SYSTEM_ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);
  
  // Load address when component mounts
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'SYSTEM_ADMIN') {
      loadAddress();
    }
  }, [status, session, addressId]);
  
  // Load address details
  const loadAddress = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/addresses?id=${addressId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error loading address');
      }
      
      const data = await response.json();
      
      if (data.addresses && data.addresses.length > 0) {
        setAddress(data.addresses[0]);
      } else {
        throw new Error('Address not found');
      }
    } catch (err) {
      console.error('Error fetching address:', err);
      setError(err instanceof Error ? err.message : 'Failed to load address');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle status update
  const handleStatusUpdate = async (status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch('/api/admin/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: addressId,
          status
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${status.toLowerCase()} address`);
      }
      
      // Reload address details
      loadAddress();
    } catch (err) {
      console.error(`Error updating address to ${status}:`, err);
      setError(err instanceof Error ? err.message : `Error updating address to ${status}`);
    }
  };
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Get status badge class based on status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };
  
  // Handle verification status change
  const handleVerificationChange = () => {
    // Reload the address to get updated verification status
    loadAddress();
  };
  
  // Render loading state
  if (status === 'loading' || (status === 'authenticated' && loading && !error)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Address Details</h1>
        <div className="flex justify-center items-center h-64">
          <Spinner />
          <span className="ml-2 text-gray-600">Loading address details...</span>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Address Details</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => router.push('/routes/admin/addresses')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to Address List
          </button>
        </div>
      </div>
    );
  }
  
  if (!address) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Address Details</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          <p>Address not found.</p>
        </div>
        <div className="mt-4">
          <button
            onClick={() => router.push('/routes/admin/addresses')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Back to Address List
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Address Details</h1>
        <button
          onClick={() => router.push('/routes/admin/addresses')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Address List
        </button>
      </div>
      
      {/* Basic Address Information */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Address:</h3>
              <p className="text-gray-900">{address.address}</p>
              {address.apartment_number && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Apt/Unit:</span> {address.apartment_number}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Owner:</h3>
              <p className="text-gray-900">{address.owner_name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status:</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${getStatusBadgeClass(address.status)}`}>
                {address.status}
              </span>
              {address.is_primary && (
                <span className="inline-flex items-center ml-2 px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                  Primary
                </span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created:</h3>
              <p className="text-gray-900">{formatDate(address.created_at)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Updated:</h3>
              <p className="text-gray-900">{formatDate(address.updated_at)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Member Information:</h3>
              <p className="text-gray-900">
                {/* @ts-ignore - we know profiles field exists from the API */}
                {address.profiles?.name || 'Unknown'}
              </p>
              <p className="text-sm text-gray-500">
                {/* @ts-ignore - we know profiles field exists from the API */}
                {address.profiles?.email || 'No email'}
              </p>
            </div>
          </div>
          
          {/* Action Buttons */}
          {address.status === 'PENDING' && (
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => handleStatusUpdate('APPROVED')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Approve Address
              </button>
              <button
                onClick={() => handleStatusUpdate('REJECTED')}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reject Address
              </button>
            </div>
          )}
          
          {address.status === 'APPROVED' && (
            <div className="mt-4">
              <button
                onClick={() => handleStatusUpdate('REJECTED')}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Revoke Approval
              </button>
            </div>
          )}
          
          {address.status === 'REJECTED' && (
            <div className="mt-4">
              <button
                onClick={() => handleStatusUpdate('APPROVED')}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Approve Address
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Address Verification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <AddressVerificationDetails 
            addressId={addressId} 
            onVerificationChange={handleVerificationChange}
          />
        </div>
        <div>
          <AddressMapView addressId={addressId} />
        </div>
      </div>
    </div>
  );
} 