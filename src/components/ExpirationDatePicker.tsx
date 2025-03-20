'use client';

import { useState, useEffect } from 'react';
import { ExpirationOption } from '@/app/models/member/Visitor';
import { calculateExpirationDate } from '@/lib/visitorAccessClient';

interface ExpirationDatePickerProps {
  onChange: (dateStr: string) => void;
  initialOption?: ExpirationOption;
  initialCustomDate?: string;
}

export default function ExpirationDatePicker({ 
  onChange,
  initialOption = '24h',
  initialCustomDate
}: ExpirationDatePickerProps) {
  const [option, setOption] = useState<ExpirationOption>(initialOption);
  const [customDate, setCustomDate] = useState<string>(initialCustomDate || '');
  
  // Set default custom date if not provided
  useEffect(() => {
    if (option === 'custom' && !customDate) {
      // Set default custom date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setCustomDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [option, customDate]);
  
  // Calculate and propagate the expiration date when options change
  useEffect(() => {
    const expirationDate = calculateExpirationDate(option, customDate);
    onChange(expirationDate);
  }, [option, customDate, onChange]);
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="space-y-3">
      <div className="font-medium text-sm mb-1">Expiration</div>
      
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setOption('24h')}
          className={`py-2 px-3 text-sm rounded border ${
            option === '24h' 
              ? 'bg-blue-100 border-blue-500 text-blue-800' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          24 hours
        </button>
        
        <button
          type="button"
          onClick={() => setOption('1w')}
          className={`py-2 px-3 text-sm rounded border ${
            option === '1w' 
              ? 'bg-blue-100 border-blue-500 text-blue-800' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          1 week
        </button>
        
        <button
          type="button"
          onClick={() => setOption('1m')}
          className={`py-2 px-3 text-sm rounded border ${
            option === '1m' 
              ? 'bg-blue-100 border-blue-500 text-blue-800' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          1 month
        </button>
        
        <button
          type="button"
          onClick={() => setOption('custom')}
          className={`py-2 px-3 text-sm rounded border ${
            option === 'custom' 
              ? 'bg-blue-100 border-blue-500 text-blue-800' 
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </div>
      
      {option === 'custom' && (
        <div className="mt-3">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      )}
      
      <div className="text-sm text-gray-600 mt-2">
        Expires: {formatDate(calculateExpirationDate(option, customDate))}
      </div>
    </div>
  );
}