'use client';

import { useState, useEffect } from 'react';
import { MemberAddress } from '@/app/models/member/Address';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminAddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  
  // Check if user is authenticated and has required role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/routes/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'SYSTEM_ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);
  
  // Load addresses when component mounts or filter changes
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'SYSTEM_ADMIN') {
      loadAddresses();
    }
  }, [status, session, filterStatus]);
  
  // Load addresses based on current filter
  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/addresses?status=${filterStatus}`);
      
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
  
  // Handle address approval or rejection
  const handleStatusUpdate = async (addressId: string, status: 'APPROVED' | 'REJECTED') => {
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
      
      // Reload addresses
      loadAddresses();
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
  
  // Render loading state
  if (status === 'loading' || (status === 'authenticated' && loading && !error)) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Address Approvals</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Address Approvals</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <label className="font-medium text-gray-700">Filter:</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1 rounded text-sm ${
                filterStatus === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('APPROVED')}
              className={`px-3 py-1 rounded text-sm ${
                filterStatus === 'APPROVED'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('REJECTED')}
              className={`px-3 py-1 rounded text-sm ${
                filterStatus === 'REJECTED'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded text-sm ${
                filterStatus === 'ALL'
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>
      
      {/* Address list */}
      {addresses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          <p>No addresses found with the current filter.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {addresses.map((address) => (
                <tr key={address.id}>
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="text-sm font-medium text-gray-900">
                      {address.address}
                    </div>
                    <div className="text-sm text-gray-500">
                      Owner: {address.owner_name}
                    </div>
                    {address.is_primary && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {/* @ts-ignore - we know profiles field exists from the API */}
                      {address.profiles?.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {/* @ts-ignore - we know profiles field exists from the API */}
                      {address.profiles?.email || 'No email'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      address.status === 'APPROVED'
                        ? 'bg-green-100 text-green-800'
                        : address.status === 'REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {address.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(address.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {address.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(address.id, 'APPROVED')}
                            className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(address.id, 'REJECTED')}
                            className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {address.status === 'APPROVED' && (
                        <button
                          onClick={() => handleStatusUpdate(address.id, 'REJECTED')}
                          className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                        >
                          Revoke
                        </button>
                      )}
                      {address.status === 'REJECTED' && (
                        <button
                          onClick={() => handleStatusUpdate(address.id, 'APPROVED')}
                          className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 