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
import { supabase } from '@/lib/supabase';

export default function VisitorManagementPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [filters, setFilters] = useState<VisitorFilterParams>({
    status: 'active' // Set default filter to only show active visitors
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [visitorToDelete, setVisitorToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk action partial success dialog state
  const [showPartialSuccessDialog, setShowPartialSuccessDialog] = useState(false);
  const [showCheckInHistoryDialog, setShowCheckInHistoryDialog] = useState(false);
  const [partialSuccessMessage, setPartialSuccessMessage] = useState('');
  const [pendingBulkAction, setPendingBulkAction] = useState<VisitorBulkAction | null>(null);
  
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
  
  // Fetch visitors data
  const fetchVisitors = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      // Always include a status filter (default to 'active' unless specified otherwise)
      if (filters.status) {
        queryParams.set('status', filters.status);
      } else {
        queryParams.set('status', 'active');
      }
      
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.sort) queryParams.set('sort', filters.sort);
      if (filters.order) queryParams.set('order', filters.order);
      if (filters.address_id) queryParams.set('address_id', filters.address_id);
      
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
    if (authStatus === 'authenticated' && session?.user?.role === 'MEMBER') {
      fetchVisitors();
      fetchAddresses();
    }
  }, [authStatus, session, filters]);
  
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
    // Open the confirmation dialog instead of using window.confirm()
    setVisitorToDelete(visitorId);
    setShowDeleteConfirmation(true);
  };
  
  // Handle actual deletion after confirmation
  const confirmDelete = async () => {
    if (!visitorToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/member/visitors?id=${visitorToDelete}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete visitor');
      }
      
      // Visitor was either hard deleted or soft deleted (deactivated)
      // Just refresh the list in either case
      fetchVisitors();
    } catch (err) {
      console.error('Error deleting visitor:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to delete visitor'}`);
    } finally {
      // Reset state
      setShowDeleteConfirmation(false);
      setVisitorToDelete(null);
      setIsDeleting(false);
    }
  };
  
  // Cancel delete operation
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setVisitorToDelete(null);
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
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle partial success case (some deleted, some not)
        if (response.status === 207 && data.code === 'PARTIAL_SUCCESS') {
          setPartialSuccessMessage(data.error);
          setPendingBulkAction({
            ...bulkAction,
            action: 'revoke'
          });
          setShowPartialSuccessDialog(true);
          return;
        }
        
        // Handle case where all selected visitors have check-in history
        if (response.status === 409 && data.code === 'VISITORS_HAVE_CHECK_INS') {
          setPartialSuccessMessage(data.error);
          setPendingBulkAction({
            ...bulkAction,
            action: 'revoke'
          });
          setShowCheckInHistoryDialog(true);
          return;
        }
        
        throw new Error(data.error || `Failed to ${bulkAction.action} visitors`);
      }
      
      // Refresh list on success
      fetchVisitors();
    } catch (err) {
      console.error(`Error performing bulk ${bulkAction.action}:`, err);
      alert(`Error: ${err instanceof Error ? err.message : `Failed to ${bulkAction.action} visitors`}`);
    }
  };
  
  // Handle the user choosing to revoke instead of delete
  const handleRevokeInstead = async () => {
    if (!pendingBulkAction) return;
    
    try {
      // First refresh the list to ensure we have the latest data
      await fetchVisitors();
      
      // Then perform the revoke action
      await handleBulkAction(pendingBulkAction);
      
      // Reset the dialogs
      setShowPartialSuccessDialog(false);
      setShowCheckInHistoryDialog(false);
      setPendingBulkAction(null);
    } catch (err) {
      console.error('Error performing revoke action:', err);
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to revoke visitor access'}`);
    }
  };
  
  // Close the partial success dialog without taking action
  const closePartialSuccessDialog = () => {
    setShowPartialSuccessDialog(false);
    setPendingBulkAction(null);
    // Refresh the list to show what was actually deleted
    fetchVisitors();
  };
  
  // Close the check-in history dialog without taking action
  const closeCheckInHistoryDialog = () => {
    setShowCheckInHistoryDialog(false);
    setPendingBulkAction(null);
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
  if (authStatus === 'loading' || (authStatus === 'authenticated' && isLoading && visitors.length === 0)) {
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
  if (authStatus === 'authenticated' && session?.user?.role !== 'MEMBER') {
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
      
      {/* Custom Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Confirm Deletion</h3>
              <p className="mb-6 text-gray-600">
                Are you sure you want to delete this visitor? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
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
                  ) : 'Delete Visitor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Partial Success Dialog */}
      {showPartialSuccessDialog && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Partial Success</h3>
              <p className="mb-6 text-gray-600">{partialSuccessMessage}</p>
              <p className="mb-6 text-gray-600">Would you like to revoke access for the remaining visitors instead?</p>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closePartialSuccessDialog}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  No, Keep As Is
                </button>
                <button
                  type="button"
                  onClick={handleRevokeInstead}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Yes, Revoke Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Check-in History Dialog */}
      {showCheckInHistoryDialog && (
        <div className="fixed inset-0 z-50 overflow-auto bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Cannot Delete Visitors</h3>
              <p className="mb-6 text-gray-600">{partialSuccessMessage}</p>
              <p className="mb-6 text-gray-600">Would you like to revoke access for these visitors instead?</p>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCheckInHistoryDialog}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRevokeInstead}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Yes, Revoke Access
                </button>
              </div>
            </div>
          </div>
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