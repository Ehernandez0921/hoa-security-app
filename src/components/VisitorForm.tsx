'use client';

import { useState, FormEvent, useEffect } from 'react';
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

export default function VisitorForm({
  visitor,
  addresses,
  onSubmit,
  onCancel,
  isSubmitting
}: VisitorFormProps) {
  // Default to the first approved address if available, otherwise the first address
  const defaultAddressId = addresses.find(a => a.status === 'APPROVED')?.id || addresses[0]?.id || '';
  
  const [formData, setFormData] = useState<VisitorCreateParams | VisitorUpdateParams>({
    id: visitor?.id || '',
    address_id: visitor?.address_id || defaultAddressId,
    first_name: visitor?.first_name || '',
    last_name: visitor?.last_name || '',
    access_code: visitor?.access_code || '',
    generate_code: !visitor?.first_name && !visitor?.last_name,
    expires_at: visitor?.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    is_active: visitor?.is_active !== undefined ? visitor.is_active : true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [visitorType, setVisitorType] = useState<'named' | 'code'>(
    visitor?.first_name || visitor?.last_name ? 'named' : 'code'
  );

  // Update form data when visitor prop changes
  useEffect(() => {
    if (visitor) {
      setFormData({
        id: visitor.id,
        address_id: visitor.address_id,
        first_name: visitor.first_name || '',
        last_name: visitor.last_name || '',
        access_code: visitor.access_code || '',
        expires_at: visitor.expires_at,
        is_active: visitor.is_active
      });
      
      setVisitorType(visitor.first_name || visitor.last_name ? 'named' : 'code');
    } else {
      setFormData({
        address_id: defaultAddressId,
        first_name: '',
        last_name: '',
        generate_code: visitorType === 'code',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
  }, [visitor, defaultAddressId]);

  // Handle input changes
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

  // Handle visitor type change
  const handleVisitorTypeChange = (type: 'named' | 'code') => {
    setVisitorType(type);
    
    // Update form data based on visitor type
    if (type === 'code') {
      setFormData(prev => ({
        ...prev,
        first_name: '',
        last_name: '',
        generate_code: true
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        generate_code: false
      }));
    }
  };

  // Handle expiration date change
  const handleExpirationChange = (date: string) => {
    setFormData(prev => ({
      ...prev,
      expires_at: date
    }));
  };

  // Handle code generation
  const handleCodeGenerated = (code: string) => {
    setFormData(prev => ({
      ...prev,
      access_code: code
    }));
  };

  // Form validation
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

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // If editing a visitor, ensure we send the correct fields
    const submitData = { ...formData };
    
    if (visitor) {
      // If editing a named visitor, don't send generate_code
      if (visitorType === 'named') {
        delete (submitData as any).generate_code;
      } 
      // If editing a code visitor, don't send first_name and last_name
      else {
        delete submitData.first_name;
        delete submitData.last_name;
      }
    }
    
    await onSubmit(submitData);
  };

  // Get address options
  const getAddressOptions = () => {
    // Filter to only show approved addresses (or the currently selected address)
    return addresses
      .filter(a => a.status === 'APPROVED' || a.id === formData.address_id)
      .map(a => (
        <option key={a.id} value={a.id}>
          {a.address} {a.status !== 'APPROVED' ? `(${a.status})` : ''}
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
              value={formData.first_name}
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
              value={formData.last_name}
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
      {visitor && (
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