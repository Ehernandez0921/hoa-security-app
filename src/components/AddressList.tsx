'use client';

import { useState, useEffect } from 'react';
import { MemberAddress, MemberAddressFilterParams } from '@/app/models/member/Address';

interface AddressListProps {
  onAddressSelect?: (addressId: string) => void;
  onEdit: (address: MemberAddress) => void;
  onDelete: (addressId: string) => Promise<void>;
  onRefresh: () => void;
  addresses: MemberAddress[];
  selectedAddressId?: string;
}

export default function AddressList({
  addresses,
  onAddressSelect,
  onEdit,
  onDelete,
  onRefresh,
  selectedAddressId
}: AddressListProps) {
  const [filter, setFilter] = useState<MemberAddressFilterParams>({
    status: 'APPROVED',
    sort: 'created',
    order: 'desc'
  });

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
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

  // Handle filter changes
  const handleFilterChange = (key: keyof MemberAddressFilterParams, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    onRefresh();
  };

  // Reset filters
  const resetFilters = () => {
    setFilter({
      status: 'APPROVED',
      sort: 'created',
      order: 'desc'
    });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-200 gap-4 sm:flex-row sm:items-center">
        {/* Status filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filter.status || 'ALL'}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-full"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {/* Sort filter */}
        <div>
          <label htmlFor="sort-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="sort-filter"
            value={`${filter.sort}_${filter.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('_');
              handleFilterChange('sort', sort);
              handleFilterChange('order', order);
            }}
            className="px-3 py-2 border border-gray-300 rounded bg-white text-sm w-full"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="address_asc">Address (A-Z)</option>
            <option value="address_desc">Address (Z-A)</option>
            <option value="status_asc">Status (A-Z)</option>
            <option value="status_desc">Status (Z-A)</option>
          </select>
        </div>

        {/* Reset button */}
        <div className="mt-auto">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-100 text-sm w-full sm:w-auto"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Address cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {addresses.length === 0 ? (
          <div className="col-span-full bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
            <p>No addresses found. Add your first address using the form above.</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className={`border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
                selectedAddressId === address.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {address.address}
                    </h3>
                    {address.apartment_number && (
                      <p className="text-sm text-gray-700 mt-0.5">
                        <span className="font-medium">Apt/Unit:</span> {address.apartment_number}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Owner: {address.owner_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Added on {formatDate(address.created_at)}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    {address.is_primary && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                    <span 
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(address.status)}`}
                    >
                      {address.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
                {onAddressSelect && (
                  <button
                    onClick={() => onAddressSelect(address.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedAddressId === address.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {selectedAddressId === address.id ? 'Selected' : 'Select'}
                  </button>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(address)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Edit
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this address?')) {
                        await onDelete(address.id);
                      }
                    }}
                    disabled={address.is_primary}
                    className={`px-3 py-1 rounded text-sm ${
                      address.is_primary
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                    title={address.is_primary ? "Cannot delete primary address" : "Delete address"}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 