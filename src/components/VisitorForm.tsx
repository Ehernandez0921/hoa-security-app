'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { Visitor, VisitorCreateParams, VisitorUpdateParams, ExpirationOption } from '@/app/models/member/Visitor';
import { MemberAddress } from '@/app/models/member/Address';
import ExpirationDatePicker from './ExpirationDatePicker';
import CodeGenerator from './CodeGenerator';

interface VisitorFormProps {
  visitor?: Visitor;
  addresses: MemberAddress[];
  onSubmit: (data: VisitorCreateParams | VisitorUpdateParams) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Create a combined type that covers both form data possibilities
type FormDataType = (VisitorCreateParams | VisitorUpdateParams);

export default function VisitorForm({
  visitor,
  addresses,
  onSubmit,
  onCancel,
  isSubmitting
}: VisitorFormProps) {
  // Track if component is mounted to prevent updates after unmount
  const isMounted = useRef(true);
  
  // Find default address once on initial render
  const defaultAddressId = useRef(
    addresses.find(a => a.status === 'APPROVED')?.id || 
    addresses[0]?.id || 
    ''
  ).current;
  
  // Determine initial visitor type just once
  const initialVisitorType = visitor?.first_name || visitor?.last_name ? 'named' : 'code';
  
  // Compute initial form state
  const getInitialFormState = (): FormDataType => {
    if (visitor) {
      // For editing existing visitor
      return {
        id: visitor.id,
        address_id: visitor.address_id,
        first_name: visitor.first_name || '',
        last_name: visitor.last_name || '',
        access_code: visitor.access_code || '',
        expires_at: visitor.expires_at,
        is_active: visitor.is_active
      } as VisitorUpdateParams;
    } else {
      // For creating new visitor
      return {
        address_id: defaultAddressId,
        first_name: '',
        last_name: '',
        generate_code: initialVisitorType === 'code',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } as VisitorCreateParams;
    }
  };
  
  // State with stable initialization and proper typing
  const [formData, setFormData] = useState<FormDataType>(getInitialFormState());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visitorType, setVisitorType] = useState<'named' | 'code'>(initialVisitorType);
  
  // Flag to prevent first render updates
  const isFirstRender = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Only update when visitor prop changes - with careful dependency management
  useEffect(() => {
    // Skip first render because we already initialized in useState
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (!visitor) return;
    
    // Update form data when editing an existing visitor
    setFormData({
      id: visitor.id,
      address_id: visitor.address_id,
      first_name: visitor.first_name || '',
      last_name: visitor.last_name || '',
      access_code: visitor.access_code || '',
      expires_at: visitor.expires_at,
      is_active: visitor.is_active
    });
    
    // Update visitor type based on visitor data
    setVisitorType(visitor.first_name || visitor.last_name ? 'named' : 'code');
  }, [visitor]); // Only depend on visitor, not any derived state

  // Handle input changes - pure function with no side effects
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle visitor type change with proper type handling
  const handleVisitorTypeChange = (type: 'named' | 'code') => {
    // First update the type
    setVisitorType(type);
    
    // Then update form data based on new type
    setFormData(prev => {
      // Create clean copy with proper type handling
      const newData = { ...prev };
      
      if (type === 'code') {
        // For code-only visitors
        newData.first_name = '';
        newData.last_name = '';
        
        // Only modify if we're creating a new visitor (not editing)
        if (!visitor && 'generate_code' in newData) {
          (newData as VisitorCreateParams).generate_code = true;
        }
      } else if (!visitor && 'generate_code' in newData) {
        // For named visitors (only when creating new)
        (newData as VisitorCreateParams).generate_code = false;
      }
      
      return newData;
    });
  };

  // Pure functions for specific state updates
  const handleExpirationChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      expires_at: date
    }));
  };

  const handleCodeGenerated = (code: string) => {
    setFormData(prev => ({
      ...prev,
      access_code: code
    }));
  };

  // Form validation - pure function with no side effects
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.address_id) {
      newErrors.address_id = 'Please select an address';
    }
    
    if (visitorType === 'named') {
      if (!formData.first_name?.trim()) {
        newErrors.first_name = 'First name is required for named visitors';
      }
      
      if (!formData.last_name?.trim()) {
        newErrors.last_name = 'Last name is required for named visitors';
      }
    }
    
    if (!formData.expires_at) {
      newErrors.expires_at = 'Expiration date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler with proper type handling
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Create a new object for submission with proper type handling
    const submitData = { ...formData };
    
    // Safely handle optional fields based on visitor type
    if (visitor) {
      // We're editing an existing visitor
      if (visitorType === 'code' && submitData.first_name !== undefined) {
        // For code-only visitors, we can safely set these to empty strings
        // instead of deleting, avoiding type errors
        submitData.first_name = '';
        submitData.last_name = '';
      }
    } else if ('generate_code' in submitData) {
      // We're creating a new visitor - ensure generate_code matches visitor type
      (submitData as VisitorCreateParams).generate_code = (visitorType === 'code');
    }
    
    await onSubmit(submitData);
  };

  // Address options function - pure with no side effects
  const getAddressOptions = () => {
    // Filter to only show approved addresses (or the currently selected address)
    return addresses
      .filter(a => a.status === 'APPROVED' || a.id === formData.address_id)
      .map(a => (
        <option key={a.id} value={a.id}>
          {a.address}
          {a.apartment_number ? ` Apt ${a.apartment_number}` : ''}
          {a.status !== 'APPROVED' ? ` (${a.status})` : ''}
          {a.is_primary ? ' (Primary)' : ''}
        </option>
      ));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-medium mb-6">
        {visitor ? 'Edit Visitor' : 'Add New Visitor'}
      </h2>
      
      {/* Address selection */}
      <div className="mb-6">
        <label htmlFor="address_id" className="block text-sm font-medium text-gray-700 mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <select
          id="address_id"
          name="address_id"
          value={formData.address_id}
          onChange={handleInputChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
            errors.address_id 
              ? 'border-red-300 focus:ring-red-500' 
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        >
          <option value="">Select an address</option>
          {getAddressOptions()}
        </select>
        {errors.address_id && (
          <p className="mt-1 text-sm text-red-600">{errors.address_id}</p>
        )}
        {addresses.length === 0 && (
          <p className="mt-1 text-sm text-yellow-600">
            You don't have any approved addresses. Please add and get approval for an address before adding visitors.
          </p>
        )}
      </div>
      
      {/* Visitor type selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Visitor Type
        </label>
        <div className="flex space-x-4">
          <div 
            className={`flex items-center p-3 border rounded-md cursor-pointer ${
              visitorType === 'named'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => handleVisitorTypeChange('named')}
          >
            <input
              type="radio"
              id="visitor-type-named"
              checked={visitorType === 'named'}
              onChange={() => handleVisitorTypeChange('named')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="visitor-type-named" className="ml-2 block text-sm text-gray-700 cursor-pointer">
              Named Visitor
            </label>
          </div>
          
          <div 
            className={`flex items-center p-3 border rounded-md cursor-pointer ${
              visitorType === 'code'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => handleVisitorTypeChange('code')}
          >
            <input
              type="radio"
              id="visitor-type-code"
              checked={visitorType === 'code'}
              onChange={() => handleVisitorTypeChange('code')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="visitor-type-code" className="ml-2 block text-sm text-gray-700 cursor-pointer">
              Access Code Only
            </label>
          </div>
        </div>
      </div>
      
      {/* Named visitor fields */}
      {visitorType === 'named' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.first_name 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name || ''}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                errors.last_name 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Code generation for code-only visitors */}
      {visitorType === 'code' && (
        <div className="mb-6">
          <CodeGenerator
            code={visitor?.access_code}
            onCodeGenerated={handleCodeGenerated}
          />
        </div>
      )}
      
      {/* Expiration date picker */}
      <div className="mb-6">
        <ExpirationDatePicker
          onChange={handleExpirationChange}
          initialOption="24h"
          initialCustomDate={visitor?.expires_at ? new Date(visitor.expires_at).toISOString().split('T')[0] : undefined}
        />
        {errors.expires_at && (
          <p className="mt-1 text-sm text-red-600">{errors.expires_at}</p>
        )}
      </div>
      
      {/* Active status toggle (only for editing) */}
      {visitor && 'is_active' in formData && (
        <div className="mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={(formData as VisitorUpdateParams).is_active}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm font-medium text-gray-700">
              Active
            </label>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            When inactive, this visitor won't be able to access the property.
          </p>
        </div>
      )}
      
      {/* Form actions */}
      <div className="flex justify-end space-x-3 mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </div>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </form>
  );
}