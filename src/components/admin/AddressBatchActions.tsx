'use client';

import { useState } from 'react';
import { Spinner } from '../ui/Spinner';

interface AddressBatchActionsProps {
  selectedAddressIds: string[];
  onBatchActionComplete?: () => void;
}

export default function AddressBatchActions({ 
  selectedAddressIds,
  onBatchActionComplete
}: AddressBatchActionsProps) {
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | 'VERIFY'>('APPROVE');
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW'>('VERIFIED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if we have any selected addresses
  const hasSelection = selectedAddressIds.length > 0;
  
  // Handle batch action
  const handleBatchAction = async () => {
    if (!hasSelection) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const payload: any = {
        address_ids: selectedAddressIds,
        action
      };
      
      // Add additional fields based on action
      if (action === 'VERIFY') {
        payload.verification_status = verificationStatus;
        if (notes) payload.verification_notes = notes;
      } else if (notes) {
        payload.verification_notes = notes;
      }
      
      const response = await fetch('/api/admin/addresses/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform batch action');
      }
      
      const data = await response.json();
      setSuccess(`Successfully updated ${data.updated_count} addresses`);
      
      // Call the callback if provided
      if (onBatchActionComplete) {
        onBatchActionComplete();
      }
    } catch (err) {
      console.error('Error performing batch action:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Batch Actions</h3>
        <p className="mt-1 text-sm text-gray-500">
          Apply actions to {selectedAddressIds.length} selected address{selectedAddressIds.length !== 1 ? 'es' : ''}
        </p>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-md">
            <p className="text-sm">{success}</p>
          </div>
        )}
        
        {/* Action Selection */}
        <div className="mb-4">
          <label htmlFor="batch-action" className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <select
            id="batch-action"
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            disabled={!hasSelection || isSubmitting}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="APPROVE">Approve Addresses</option>
            <option value="REJECT">Reject Addresses</option>
            <option value="VERIFY">Update Verification Status</option>
          </select>
        </div>
        
        {/* Verification Status Selection (only shown for VERIFY action) */}
        {action === 'VERIFY' && (
          <div className="mb-4">
            <label htmlFor="verification-status" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Status
            </label>
            <select
              id="verification-status"
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value as any)}
              disabled={!hasSelection || isSubmitting}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="INVALID">Invalid</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>
          </div>
        )}
        
        {/* Notes Input */}
        <div className="mb-4">
          <label htmlFor="batch-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="batch-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!hasSelection || isSubmitting}
            rows={3}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Add notes (optional)..."
          />
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleBatchAction}
            disabled={!hasSelection || isSubmitting}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              !hasSelection
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Processing...
              </>
            ) : (
              'Apply to Selected'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 