'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Visitor, VisitorCreateParams, VisitorUpdateParams, VisitorBulkAction, VisitorFilterParams } from '@/app/models/member/Visitor';
import { MemberAddress } from '@/app/models/member/Address';
// Import only client-side utility functions if needed
import { generateRandomCode, calculateExpirationDate } from '@/lib/visitorAccessClient';
import VisitorList from '@/components/VisitorList';
import VisitorForm from '@/components/VisitorForm';

export default function VisitorManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [filters, setFilters] = useState<VisitorFilterParams>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if not authenticated or not a MEMBER
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/routes/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'MEMBER') {
      router.push('/');
    }
  }, [status, session, router]);
  
  // Fetch visitors data
  const fetchVisitors = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.sort) queryParams.set('sort', filters.sort);
      if (filters.order) queryParams.set('order', filters.order);
      
      const response = await fetch(`/api/member/visitors?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch visitors');
      }
      
      const data = await response.json();
      setVisitors(data.visitors || []);
    } catch (err) {
      console.error('Error fetching visitors:', err);
      setError('Failed to load visitors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch addresses data
  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/member/addresses?status=APPROVED');
      
      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }
      
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      // We don't set the main error state for addresses, but we log the error
      // User will be notified in the form that they don't have approved addresses
    }
  };
  
  // Load visitors and addresses when component mounts or when filters change
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'MEMBER') {
      fetchVisitors();
      fetchAddresses();
    }
  }, [status, session, filters]);
  
  // Create a new visitor
  const handleCreateVisitor = async (visitorData: VisitorCreateParams | VisitorUpdateParams) => {
    setIsSubmitting(true);
    try {
      // For create operation, we need VisitorCreateParams
      const createData = visitorData as VisitorCreateParams;
      
      const response = await fetch('/api/member/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create visitor');
      }
      
      // Close form and refresh list
      setShowAddForm(false);
      fetchVisitors();
    } catch (err) {
      console.error('Error creating visitor:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to create visitor'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Update an existing visitor
  const handleUpdateVisitor = async (visitorData: VisitorCreateParams | VisitorUpdateParams) => {
    setIsSubmitting(true);
    try {
      // For update operation, we need VisitorUpdateParams
      const updateData = visitorData as VisitorUpdateParams;
      
      const response = await fetch('/api/member/visitors', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update visitor');
      }
      
      // Close form and refresh list
      setEditingVisitor(null);
      fetchVisitors();
    } catch (err) {
      console.error('Error updating visitor:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to update visitor'}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Delete a visitor
  const handleDeleteVisitor = async (visitorId: string) => {
    if (!window.confirm('Are you sure you want to delete this visitor?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/member/visitors?id=${visitorId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete visitor');
      }
      
      // Refresh list
      fetchVisitors();
    } catch (err) {
      console.error('Error deleting visitor:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to delete visitor'}`);
    }
  };
  
  // Perform bulk actions on visitors
  const handleBulkAction = async (bulkAction: VisitorBulkAction) => {
    try {
      const response = await fetch('/api/member/visitors/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkAction)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${bulkAction.action} visitors`);
      }
      
      // Refresh list
      fetchVisitors();
    } catch (err) {
      console.error(`Error performing bulk ${bulkAction.action}:`, err);
      alert(`Error: ${err instanceof Error ? err.message : `Failed to ${bulkAction.action} visitors`}`);
    }
  };
  
  // Inactivate/revoke a visitor's access
  const handleInactivateVisitor = async (visitorId: string) => {
    try {
      const response = await fetch('/api/member/visitors/inactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: visitorId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to inactivate visitor');
      }
      
      // Refresh list after inactivation
      fetchVisitors();
    } catch (err) {
      console.error('Error inactivating visitor:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to inactivate visitor'}`);
    }
  };
  
  // Show loading state
  if (status === 'loading' || (status === 'authenticated' && isLoading && visitors.length === 0)) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Visitor Management</h1>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading visitor information...</p>
        </div>
      </div>
    );
  }
  
  // Show unauthorized state
  if (status === 'authenticated' && session?.user?.role !== 'MEMBER') {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Visitor Management</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>You don't have permission to access this page. This feature is only available to members.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Visitor Management</h1>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={addresses.length === 0}
          title={addresses.length === 0 ? "You need at least one approved address to add visitors" : ""}
        >
          Add Visitor
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
          <button
            onClick={fetchVisitors}
            className="text-red-700 font-medium underline mt-2"
          >
            Try Again
          </button>
        </div>
      )}
      
      {addresses.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <p>You don't have any approved addresses. Please add and get approval for an address before adding visitors.</p>
          <button
            onClick={() => router.push('/routes/member/addresses')}
            className="text-yellow-700 font-medium underline mt-2"
          >
            Go to Address Management
          </button>
        </div>
      )}
      
      {showAddForm && (
        <div className="mb-6 p-5 border border-gray-200 rounded-lg shadow-sm bg-white">
          <VisitorForm
            addresses={addresses}
            onSubmit={handleCreateVisitor}
            onCancel={() => setShowAddForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
      
      {editingVisitor && (
        <div className="mb-6 p-5 border border-gray-200 rounded-lg shadow-sm bg-white">
          <VisitorForm
            visitor={editingVisitor}
            addresses={addresses}
            onSubmit={handleUpdateVisitor}
            onCancel={() => setEditingVisitor(null)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
      
      {/* Visitor list */}
      {visitors.length > 0 ? (
        <VisitorList
          visitors={visitors}
          addresses={addresses}
          onEdit={setEditingVisitor}
          onDelete={handleDeleteVisitor}
          onInactivate={handleInactivateVisitor}
          onBulkAction={handleBulkAction}
          onRefresh={fetchVisitors}
        />
      ) : !isLoading ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600">No visitors found. Click "Add Visitor" to create your first visitor.</p>
        </div>
      ) : null}
    </div>
  );
}