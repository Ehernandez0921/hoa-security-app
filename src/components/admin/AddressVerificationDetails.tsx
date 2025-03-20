'use client';

import { useState, useEffect } from 'react';
import { AddressVerificationDetails as VerificationDetails, MemberAddress } from '@/app/models/member/Address';
import { Spinner } from '../ui/Spinner';

interface AddressVerificationDetailsProps {
  addressId: string;
  onVerificationChange?: (status: string, notes?: string) => void;
}

export default function AddressVerificationDetails({ 
  addressId, 
  onVerificationChange 
}: AddressVerificationDetailsProps) {
  const [verification, setVerification] = useState<VerificationDetails | null>(null);
  const [address, setAddress] = useState<MemberAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW'>('UNVERIFIED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fetch verification details when component mounts or addressId changes
  useEffect(() => {
    const fetchVerificationDetails = async () => {
      if (!addressId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/admin/addresses/verify?id=${addressId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch verification details');
        }
        
        const data = await response.json();
        setVerification(data.verification);
        setAddress(data.address);
        
        // Initialize form state with existing values
        if (data.verification) {
          setStatus(data.verification.verification_status || 'UNVERIFIED');
          setNotes(data.verification.verification_notes || '');
        }
      } catch (err) {
        console.error('Error fetching verification details:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVerificationDetails();
  }, [addressId]);
  
  // Handle manual verification status update
  const handleVerificationUpdate = async () => {
    if (!addressId) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/addresses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          address_id: addressId,
          verification_status: status,
          verification_notes: notes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update verification status');
      }
      
      // Call onVerificationChange if provided
      if (onVerificationChange) {
        onVerificationChange(status, notes);
      }
      
      // Update local state with new data
      const data = await response.json();
      if (verification) {
        setVerification({
          ...verification,
          verification_status: status,
          verification_notes: notes,
          verification_date: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error updating verification status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update verification status');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get color class based on verification status
  const getStatusColorClass = (verificationStatus: string) => {
    switch (verificationStatus) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'INVALID':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'NEEDS_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'UNVERIFIED':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-6 bg-white border border-gray-200 rounded-lg">
        <Spinner />
        <span className="ml-2 text-gray-600">Loading verification details...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <p className="font-medium">Error loading verification details</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }
  
  if (!verification || !address) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg">
        <p>No verification data available for this address.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Address Verification</h3>
      </div>
      
      <div className="p-4 bg-gray-50">
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-500 block mb-1">Current Status:</span>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${getStatusColorClass(verification.verification_status)}`}
          >
            {verification.verification_status || 'UNVERIFIED'}
          </span>
        </div>
        
        {/* Original & Standardized Address */}
        <div className="mb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm font-medium text-gray-500 block mb-1">Original Address:</span>
              <p className="text-sm text-gray-900">{verification.original_address}</p>
              {address.apartment_number && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">Apt/Unit:</span> {address.apartment_number}
                </p>
              )}
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-500 block mb-1">Standardized Address:</span>
              <p className="text-sm text-gray-900">{verification.standardized_address || 'Not available'}</p>
            </div>
          </div>
        </div>
        
        {/* Address Components */}
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-500 block mb-2">Address Components:</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="bg-white p-2 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Street Number</span>
              <span className="text-sm font-medium">{verification.components.street_number || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Street</span>
              <span className="text-sm font-medium">{verification.components.street || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">City</span>
              <span className="text-sm font-medium">{verification.components.city || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">State</span>
              <span className="text-sm font-medium">{verification.components.state || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">ZIP</span>
              <span className="text-sm font-medium">{verification.components.zip || 'N/A'}</span>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200">
              <span className="text-xs text-gray-500 block">Country</span>
              <span className="text-sm font-medium">{verification.components.country || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        {/* Coordinates */}
        {verification.coordinates && (
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-500 block mb-1">Coordinates:</span>
            <p className="text-sm text-gray-900">
              {verification.coordinates.latitude.toFixed(6)}, {verification.coordinates.longitude.toFixed(6)}
            </p>
          </div>
        )}
        
        {/* Verification Notes */}
        <div className="mb-4">
          <span className="text-sm font-medium text-gray-500 block mb-1">Verification Notes:</span>
          <p className="text-sm text-gray-900 bg-white p-2 rounded border border-gray-200">
            {verification.verification_notes || 'No notes available'}
          </p>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Update Verification Status</h4>
        
        {/* Status Selection */}
        <div className="mb-4">
          <label htmlFor="verification-status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="verification-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="INVALID">Invalid</option>
            <option value="NEEDS_REVIEW">Needs Review</option>
          </select>
        </div>
        
        {/* Notes Input */}
        <div className="mb-4">
          <label htmlFor="verification-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="verification-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Add verification notes here..."
          />
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleVerificationUpdate}
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Updating...
              </>
            ) : (
              'Update Verification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 