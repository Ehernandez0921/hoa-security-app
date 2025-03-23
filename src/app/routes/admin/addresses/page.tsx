'use client';

import { useState, useEffect } from 'react';
import { MemberAddress } from '@/app/models/member/Address';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AddressBatchActions from '@/components/admin/AddressBatchActions';

export default function AdminAddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredAddresses, setFilteredAddresses] = useState<MemberAddress[]>([]);
  
  // Apply filters whenever addresses or search query changes
  useEffect(() => {
    let filtered = [...addresses];

    // Apply status filter
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(address => address.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(address => 
        address.address?.toLowerCase().includes(query) ||
        address.apartment_number?.toLowerCase().includes(query) ||
        address.owner_name?.toLowerCase().includes(query) ||
        // @ts-ignore - we know profiles field exists from the API as it's used in the table
        address.profiles?.name?.toLowerCase().includes(query) ||
        // @ts-ignore - we know profiles field exists from the API as it's used in the table
        address.profiles?.email?.toLowerCase().includes(query)
      );
    }

    setFilteredAddresses(filtered);
  }, [addresses, filterStatus, searchQuery]);
  
  // Check if user is authenticated and has required role
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
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
      
      const apiUrl = `/api/admin/addresses?status=${filterStatus}`;
      console.log('Fetching addresses from:', apiUrl);
      
      // Add timestamp to prevent caching
      const response = await fetch(`${apiUrl}&_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Error loading addresses');
        } catch (e) {
          throw new Error(`Error loading addresses: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('Addresses received:', data);
      
      if (!data.addresses) {
        console.error('No addresses array found in API response');
        setAddresses([]);
      } else {
        console.log(`Found ${data.addresses.length} addresses with status: ${filterStatus}`);
        setAddresses(data.addresses);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
      setAddresses([]);
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
  
  // Toggle address selection for batch operations
  const toggleAddressSelection = (addressId: string) => {
    setSelectedAddressIds(prev => {
      if (prev.includes(addressId)) {
        return prev.filter(id => id !== addressId);
      } else {
        return [...prev, addressId];
      }
    });
  };
  
  // Toggle all addresses selection
  const toggleAllAddresses = () => {
    if (selectedAddressIds.length === addresses.length) {
      setSelectedAddressIds([]);
    } else {
      setSelectedAddressIds(addresses.map(addr => addr.id));
    }
  };
  
  // Handle batch operation completion
  const handleBatchActionComplete = () => {
    // Clear selections
    setSelectedAddressIds([]);
    // Reload addresses
    loadAddresses();
  };
  
  // View address details
  const viewAddressDetails = (addressId: string) => {
    router.push(`/routes/admin/addresses/${addressId}`);
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
      <div className="mb-6 space-y-4">
        {/* Search Box */}
        <div className="w-full max-w-md">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by address, member name, or email..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700">
              Status:
            </label>
            <select
              id="statusFilter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border rounded p-2 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            {filteredAddresses.length} address{filteredAddresses.length !== 1 ? 'es' : ''} found
          </div>
        </div>
      </div>
      
      {/* Batch Actions (only shown when addresses are selected) */}
      {selectedAddressIds.length > 0 && (
        <div className="mb-6">
          <AddressBatchActions
            selectedAddressIds={selectedAddressIds}
            onBatchActionComplete={handleBatchActionComplete}
          />
        </div>
      )}
      
      {/* Address list */}
      {filteredAddresses.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          <p>No addresses found with the current filter.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500">
                  <input
                    type="checkbox"
                    checked={selectedAddressIds.length === addresses.length && addresses.length > 0}
                    onChange={toggleAllAddresses}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
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
              {filteredAddresses.map((address) => (
                <tr key={address.id}>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedAddressIds.includes(address.id)}
                      onChange={() => toggleAddressSelection(address.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="text-sm font-medium text-gray-900">
                      {address.address}
                    </div>
                    {address.apartment_number && (
                      <div className="text-sm text-gray-600">
                        Apt/Unit: {address.apartment_number}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Owner: {address.owner_name}
                    </div>
                    {address.is_primary && (
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                    {address.verification_status && (
                      <span className={`inline-flex items-center ml-1 mt-1 px-2 py-0.5 rounded text-xs font-medium ${getVerificationStatusClass(address.verification_status)}`}>
                        {address.verification_status}
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
                      <button
                        onClick={() => viewAddressDetails(address.id)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-2 py-1 rounded"
                      >
                        Details
                      </button>
                      
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

// Helper function to get verification status badge colors
function getVerificationStatusClass(status: string) {
  switch (status) {
    case 'VERIFIED':
      return 'bg-green-100 text-green-800';
    case 'INVALID':
      return 'bg-red-100 text-red-800';
    case 'NEEDS_REVIEW':
      return 'bg-yellow-100 text-yellow-800';
    case 'UNVERIFIED':
    default:
      return 'bg-gray-100 text-gray-600';
  }
} 