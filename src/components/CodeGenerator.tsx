'use client';

import { useState, useEffect } from 'react';

interface CodeGeneratorProps {
  code?: string;
  onCodeGenerated: (code: string) => void;
}

export default function CodeGenerator({ code, onCodeGenerated }: CodeGeneratorProps) {
  const [accessCode, setAccessCode] = useState(code || '');
  const [isLoading, setIsLoading] = useState(false);
  
  // If code is provided, use it
  useEffect(() => {
    if (code) {
      setAccessCode(code);
    }
  }, [code]);
  
  // Generate a new access code
  const generateCode = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/member/visitors/code');
      
      if (!response.ok) {
        throw new Error('Failed to generate access code');
      }
      
      const data = await response.json();
      setAccessCode(data.accessCode);
      onCodeGenerated(data.accessCode);
    } catch (error) {
      console.error('Error generating access code:', error);
      alert('Failed to generate access code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy code to clipboard
  const copyToClipboard = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      // Show feedback (could be enhanced with a toast notification)
      alert('Access code copied to clipboard');
    }
  };
  
  return (
    <div className="space-y-3">
      <div className="font-medium text-sm mb-1">Access Code</div>
      
      {accessCode ? (
        <div className="flex items-center space-x-2">
          <div className="flex-1 p-4 border border-gray-300 rounded bg-gray-50 text-center">
            <span className="text-2xl font-mono font-bold tracking-wider">{accessCode}</span>
          </div>
          
          <button
            type="button"
            onClick={copyToClipboard}
            className="p-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
            title="Copy to clipboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={generateCode}
            disabled={isLoading}
            className="p-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            title="Generate new code"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={generateCode}
          disabled={isLoading}
          className="w-full py-2 px-4 border border-gray-300 rounded flex items-center justify-center space-x-2 hover:bg-gray-50 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Generating...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              <span>Generate Access Code</span>
            </>
          )}
        </button>
      )}
      
      <div className="text-xs text-gray-500">
        This code will allow entry without requiring a specific name.
      </div>
    </div>
  );
}