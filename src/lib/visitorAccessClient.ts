import { supabase } from '@/lib/supabase';
import { Visitor, VisitorFilterParams } from '@/app/models/member/Visitor';

/**
 * Get all visitors for the authenticated member
 * This is a client-side wrapper that calls the API endpoint
 */
export async function fetchMemberVisitors(filters?: VisitorFilterParams): Promise<Visitor[]> {
  // Build query params for filters
  const queryParams = new URLSearchParams();
  
  if (filters) {
    if (filters.search) {
      queryParams.set('search', filters.search);
    }
    if (filters.status) {
      queryParams.set('status', filters.status);
    }
    if (filters.sort) {
      queryParams.set('sort', filters.sort);
    }
    if (filters.order) {
      queryParams.set('order', filters.order);
    }
  }
  
  const endpoint = `/api/member/visitors${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch visitors');
  }
  
  const data = await response.json();
  return data.visitors || [];
}

/**
 * Generate a random 6-digit access code - can be used client-side
 * This function doesn't need to be async since it's just a utility
 */
export function generateRandomCode(): string {
  // Generate a random 6-digit number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Calculate expiration date from option - can be used client-side
 * This function doesn't need to be async since it's just a utility
 */
export function calculateExpirationDate(option: string, customDate?: string): string {
  const now = new Date();
  
  switch (option) {
    case '24h':
      now.setHours(now.getHours() + 24);
      break;
    case '1w':
      now.setDate(now.getDate() + 7);
      break;
    case '1m':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'custom':
      if (customDate) {
        return new Date(customDate).toISOString();
      }
      // Default to 24h if no custom date provided
      now.setHours(now.getHours() + 24);
      break;
  }
  
  return now.toISOString();
} 