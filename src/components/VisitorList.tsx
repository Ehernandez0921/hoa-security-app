'use client';

import { useState } from 'react';
import { Visitor, VisitorFilterParams, VisitorBulkAction } from '@/app/models/member/Visitor';
import { MemberAddress } from '@/app/models/member/Address';

interface VisitorListProps {
  visitors: Visitor[];
  addresses: MemberAddress[];
  onEdit: (visitor: Visitor) => void;
  onDelete: (visitorId: string) => void;
  onBulkAction: (action: VisitorBulkAction) => Promise<void>;
  onRefresh: () => void;
  onInactivate?: (visitorId: string) => Promise<void>;
}

export default function VisitorList({ 
  visitors, 
  addresses,
  onEdit, 
  onDelete, 
  onBulkAction,
  onRefresh,
  onInactivate
}: VisitorListProps) {
  const [selectedVisitors, setSelectedVisitors] = useState<string[]>([]);
  const [isExtendDialogOpen, setIsExtendDialogOpen] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [filter, setFilter] = useState<VisitorFilterParams>({
    status: 'active',
    sort: 'created',
    order: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Determine if visitor has expired
  const isExpired = (visitor: Visitor) => {
    return !visitor.is_active || new Date(visitor.expires_at) < new Date();
  };
  
  // Toggle selection of a single visitor
  const toggleSelect = (visitorId: string) => {
    setSelectedVisitors(prev => 
      prev.includes(visitorId)
        ? prev.filter(id => id !== visitorId)
        : [...prev, visitorId]
    );
  };
  
  // Toggle selection of all visitors
  const toggleSelectAll = () => {
    setSelectedVisitors(
      selectedVisitors.length === visitors.length
        ? []
        : visitors.map(v => v.id)
    );
  };
  
  // Handle filter changes
  const handleFilterChange = (key: keyof VisitorFilterParams, value: any) => {
    setFilter(prev => ({ ...prev, [key]: value }));
    onRefresh();
  };
  
  // Handle search input
  const handleSearch = () => {
    setFilter(prev => ({ ...prev, search: searchTerm }));
    onRefresh();
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilter({
      status: 'active',
      sort: 'created',
      order: 'desc'
    });
    setSearchTerm('');
    onRefresh();
  };
  
  // Handle bulk actions
  const handleBulkAction = async (action: 'extend' | 'revoke' | 'delete') => {
    if (selectedVisitors.length === 0) return;
    
    setIsLoading(true);
    
    try {
      if (action === 'extend') {
        setIsExtendDialogOpen(true);
        return;
      }
      
      // Confirm before performing destructive actions
      if (action === 'delete' || action === 'revoke') {
        const actionText = action === 'delete' ? 'delete' : 'revoke access for';
        const confirmMessage = `Are you sure you want to ${actionText} ${selectedVisitors.length} visitor${selectedVisitors.length !== 1 ? 's' : ''}?`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
      
      await onBulkAction({
        action,
        ids: selectedVisitors
      });
      
      // Clear selections after successful action
      setSelectedVisitors([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle extending expiration date
  const handleExtend = async () => {
    if (!extendDate || selectedVisitors.length === 0) return;
    
    setIsLoading(true);
    
    try {
      await onBulkAction({
        action: 'extend',
        ids: selectedVisitors,
        expires_at: new Date(extendDate).toISOString()
      });
      
      // Close dialog and clear selections after successful action
      setIsExtendDialogOpen(false);
      setSelectedVisitors([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render visitor name or code
  const renderVisitorIdentifier = (visitor: Visitor) => {
    if (visitor.first_name || visitor.last_name) {
      return (
        <div>
          <div className="font-medium">{`${visitor.first_name || ''} ${visitor.last_name || ''}`.trim()}</div>
          {visitor.address && <div className="text-sm text-gray-500">{visitor.address}</div>}
        </div>
      );
    } else if (visitor.access_code) {
      return (
        <div>
          <div className="font-mono font-medium">Code: {visitor.access_code}</div>
          {visitor.address && <div className="text-sm text-gray-500">{visitor.address}</div>}
        </div>
      );
    } else {
      return (
        <div>
          <div className="text-gray-400">No identification</div>
          {visitor.address && <div className="text-sm text-gray-500">{visitor.address}</div>}
        </div>
      );
    }
  };

  // Render action buttons for a visitor
  const renderActionButtons = (visitor: Visitor) => (
    <div className="flex flex-col space-y-2">
      <button
        onClick={() => onEdit(visitor)}
        className="w-full px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
      >
        Edit
      </button>
      {onInactivate && !isExpired(visitor) && (
        <button
          onClick={() => {
            if (window.confirm(`Are you sure you want to revoke access for this visitor?`)) {
              onInactivate(visitor.id);
            }
          }}
          className="w-full px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm font-medium"
        >
          Revoke
        </button>
      )}
      <button
        onClick={() => onDelete(visitor.id)}
        className="w-full px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
      >
        Delete
      </button>
    </div>
  );
  
  // Render no visitors message
  const renderNoVisitorsMessage = () => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
      {filter.search || filter.address_id ? (
        <>
          <p>No visitors match your search criteria.</p>
          <button
            onClick={resetFilters}
            className="mt-2 text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </>
      ) : (
        <p>No visitors found. Add your first visitor using the button above.</p>
      )}
    </div>
  );
  
  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-200 gap-4">
        {/* Search and filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search field - full width on small screens, half width on medium screens */}
          <div className="flex sm:col-span-2 lg:col-span-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name or code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
          </div>
          
          {/* Address dropdown */}
          <select
            value={filter.address_id || ''}
            onChange={(e) => handleFilterChange('address_id', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded bg-white"
          >
            <option value="">All Addresses</option>
            {addresses.map(address => (
              <option key={address.id} value={address.id}>
                {address.address}
              </option>
            ))}
          </select>
          
          {/* Status dropdown */}
          <select
            value={filter.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded bg-white"
          >
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
            <option value="all">All Visitors</option>
          </select>
          
          {/* Sort dropdown */}
          <select
            value={`${filter.sort}_${filter.order}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('_');
              handleFilterChange('sort', sort);
              handleFilterChange('order', order);
            }}
            className="px-3 py-2 border border-gray-300 rounded bg-white"
          >
            <option value="created_desc">Newest First</option>
            <option value="created_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
        
        {/* Buttons for bulk actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={toggleSelectAll}
            className={`text-sm px-3 py-1.5 border rounded-md ${
              selectedVisitors.length > 0 
                ? 'bg-blue-50 border-blue-300 text-blue-700' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {selectedVisitors.length === visitors.length 
              ? 'Deselect All' 
              : selectedVisitors.length > 0 
                ? `Selected ${selectedVisitors.length}` 
                : 'Select All'
            }
          </button>
          
          <button
            onClick={() => handleBulkAction('extend')}
            disabled={selectedVisitors.length === 0 || isLoading}
            className="text-sm px-3 py-1.5 bg-green-100 text-green-700 border border-green-300 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Extend
          </button>
          
          <button
            onClick={() => handleBulkAction('revoke')}
            disabled={selectedVisitors.length === 0 || isLoading}
            className="text-sm px-3 py-1.5 bg-orange-100 text-orange-700 border border-orange-300 rounded-md hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke
          </button>
          
          <button
            onClick={() => handleBulkAction('delete')}
            disabled={selectedVisitors.length === 0 || isLoading}
            className="text-sm px-3 py-1.5 bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
          
          <button
            onClick={onRefresh}
            className="ml-auto text-sm px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Visitor table */}
      {visitors.length > 0 ? (
        <div className="overflow-hidden shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-10 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedVisitors.length === visitors.length && visitors.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  />
                </th>
                <th scope="col" className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitor
                </th>
                <th scope="col" className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th scope="col" className="w-20 px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="w-1/5 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th scope="col" className="w-40 min-w-[150px] px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visitors.map((visitor) => (
                <tr key={visitor.id} className={isExpired(visitor) ? 'bg-gray-50' : ''}>
                  <td className="w-10 px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedVisitors.includes(visitor.id)}
                      onChange={() => toggleSelect(visitor.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                  </td>
                  <td className="w-1/4 px-6 py-4">
                    {renderVisitorIdentifier(visitor)}
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(visitor.expires_at)}
                  </td>
                  <td className="w-20 px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        !visitor.is_active
                          ? 'bg-red-100 text-red-800'
                          : new Date(visitor.expires_at) < new Date()
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {!visitor.is_active
                        ? 'Inactive'
                        : new Date(visitor.expires_at) < new Date()
                          ? 'Expired'
                          : 'Active'}
                    </span>
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visitor.last_used ? formatDate(visitor.last_used) : 'Never'}
                  </td>
                  <td className="w-40 min-w-[150px] px-6 py-4 whitespace-nowrap">
                    {renderActionButtons(visitor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        renderNoVisitorsMessage()
      )}
      
      {/* Date extension dialog */}
      {isExtendDialogOpen && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Extend Expiration Date</h3>
              <p className="mb-4 text-sm text-gray-600">
                Set a new expiration date for {selectedVisitors.length} selected visitor{selectedVisitors.length !== 1 ? 's' : ''}.
              </p>
              
              <div className="mb-4">
                <label htmlFor="extend-date" className="block text-sm font-medium text-gray-700 mb-1">
                  New Expiration Date
                </label>
                <input
                  type="datetime-local"
                  id="extend-date"
                  value={extendDate}
                  onChange={(e) => setExtendDate(e.target.value)}
                  min={new Date().toISOString().split('.')[0].slice(0, -3)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsExtendDialogOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExtend}
                  disabled={!extendDate || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Extend Expiration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}