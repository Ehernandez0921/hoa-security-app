// This file is intended for server-side use only
import 'server-only';

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Session } from 'next-auth';
import { Visitor, VisitorCreateParams, VisitorUpdateParams, VisitorBulkAction, VisitorFilterParams } from '@/app/models/member/Visitor';

// Helper function to get the appropriate Supabase client
const getSupabaseClient = () => {
  if (supabaseAdmin) {
    console.log('Using supabaseAdmin client');
    return supabaseAdmin;
  }
  
  console.log('Falling back to regular client');
  return supabase;
};

/**
 * Get all visitors for the authenticated member
 */
export async function getMemberVisitors(session: Session, filters?: VisitorFilterParams): Promise<Visitor[]> {
  if (!session?.user?.id) {
    console.error('No user ID in session for getMemberVisitors');
    throw new Error('Authentication required');
  }

  // Build query using the member_visitors_view which joins addresses
  let query = getSupabaseClient()
    .from('member_visitors_view')
    .select('*')
    .eq('member_id', session.user.id);
  
  // Apply filters
  if (filters) {
    // Filter by address
    if (filters.address_id) {
      query = query.eq('address_id', filters.address_id);
    }
    
    // Filter by search term (name or access code)
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,access_code.eq.${filters.search}`
      );
    }
    
    // Filter by status
    if (filters.status === 'active') {
      query = query.eq('is_active', true).gt('expires_at', new Date().toISOString());
    } else if (filters.status === 'expired') {
      query = query.or(`is_active.eq.false,expires_at.lt.${new Date().toISOString()}`);
    }
    
    // Apply sorting
    if (filters.sort) {
      const order = filters.order || 'asc';
      switch (filters.sort) {
        case 'name':
          query = query.order('first_name', { ascending: order === 'asc' });
          break;
        case 'created':
          query = query.order('created_at', { ascending: order === 'asc' });
          break;
        case 'expires':
          query = query.order('expires_at', { ascending: order === 'asc' });
          break;
      }
    } else {
      // Default order by creation date (newest first)
      query = query.order('created_at', { ascending: false });
    }
  } else {
    // Default order by creation date (newest first)
    query = query.order('created_at', { ascending: false });
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching member visitors:', error);
    throw new Error('Failed to fetch visitors');
  }
  
  return data as Visitor[];
}

/**
 * Create a new visitor for the authenticated member
 */
export async function createVisitor(session: Session, visitorData: VisitorCreateParams): Promise<Visitor> {
  if (!session?.user?.id) {
    console.error('No user ID in session for createVisitor');
    throw new Error('Authentication required');
  }

  // Verify the address belongs to the member
  const { data: addressData, error: addressError } = await getSupabaseClient()
    .from('member_addresses')
    .select('id')
    .eq('id', visitorData.address_id)
    .eq('member_id', session.user.id)
    .single();
  
  if (addressError || !addressData) {
    console.error('Error verifying address ownership:', addressError);
    throw new Error('Address not found or you do not have permission to use it');
  }

  // Generate access code if requested
  let accessCode: string | undefined;
  if (visitorData.generate_code) {
    accessCode = generateRandomCode();
  }
  
  const newVisitor = {
    address_id: visitorData.address_id,
    first_name: visitorData.first_name,
    last_name: visitorData.last_name,
    access_code: accessCode,
    is_active: true,
    expires_at: visitorData.expires_at,
  };
  
  const { data, error } = await getSupabaseClient()
    .from('allowed_visitors')
    .insert(newVisitor)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating visitor:', error);
    throw new Error('Failed to create visitor');
  }
  
  return data as Visitor;
}

/**
 * Update an existing visitor
 */
export async function updateVisitor(session: Session, visitorData: VisitorUpdateParams): Promise<Visitor> {
  if (!session?.user?.id) {
    console.error('No user ID in session for updateVisitor');
    throw new Error('Authentication required');
  }

  // First, check if the visitor belongs to the member
  const { data: visitorCheck, error: checkError } = await getSupabaseClient()
    .from('member_visitors_view')
    .select('id, member_id')
    .eq('id', visitorData.id)
    .eq('member_id', session.user.id)
    .single();
  
  if (checkError || !visitorCheck) {
    console.error('Error finding visitor:', checkError);
    throw new Error('Visitor not found or you do not have permission to update it');
  }
  
  // If updating address_id, verify the new address belongs to the member
  if (visitorData.address_id) {
    const { data: addressData, error: addressError } = await getSupabaseClient()
      .from('member_addresses')
      .select('id')
      .eq('id', visitorData.address_id)
      .eq('member_id', session.user.id)
      .single();
    
    if (addressError || !addressData) {
      console.error('Error verifying address ownership:', addressError);
      throw new Error('Address not found or you do not have permission to use it');
    }
  }
  
  // Prepare update data
  const updateData = { ...visitorData };
  delete (updateData as any).id; // Remove ID from the update data
  
  const { data, error } = await getSupabaseClient()
    .from('allowed_visitors')
    .update(updateData)
    .eq('id', visitorData.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating visitor:', error);
    throw new Error('Failed to update visitor');
  }
  
  return data as Visitor;
}

/**
 * Delete a visitor
 */
export async function deleteVisitor(session: Session, visitorId: string): Promise<boolean> {
  if (!session?.user?.id) {
    console.error('No user ID in session for deleteVisitor');
    throw new Error('Authentication required');
  }
  
  // First verify the visitor belongs to the member through their address
  const { data: visitorCheck, error: checkError } = await getSupabaseClient()
    .from('member_visitors_view')
    .select('id')
    .eq('id', visitorId)
    .eq('member_id', session.user.id)
    .single();
  
  if (checkError || !visitorCheck) {
    console.error('Error verifying visitor ownership:', checkError);
    throw new Error('Visitor not found or you do not have permission to delete it');
  }
  
  const { error } = await getSupabaseClient()
    .from('allowed_visitors')
    .delete()
    .eq('id', visitorId);
  
  if (error) {
    console.error('Error deleting visitor:', error);
    throw new Error('Failed to delete visitor');
  }
  
  return true;
}

/**
 * Perform bulk actions on visitors
 */
export async function bulkVisitorAction(session: Session, bulkAction: VisitorBulkAction): Promise<boolean> {
  if (!session?.user?.id) {
    console.error('No user ID in session for bulkVisitorAction');
    throw new Error('Authentication required');
  }
  
  // First verify all visitors belong to the member through their addresses
  const { data: visitorCheck, error: checkError } = await getSupabaseClient()
    .from('member_visitors_view')
    .select('id')
    .eq('member_id', session.user.id)
    .in('id', bulkAction.ids);
  
  if (checkError) {
    console.error('Error checking visitor ownership:', checkError);
    throw new Error('Failed to verify visitors');
  }
  
  // Make sure all requested IDs are owned by this member
  const foundIds = visitorCheck.map((v: { id: string }) => v.id);
  const isAllowed = bulkAction.ids.every(id => foundIds.includes(id));
  
  if (!isAllowed) {
    console.error('Visitor ownership verification failed - some IDs were not found');
    throw new Error('One or more visitors not found or access denied');
  }
  
  let error;
  
  // Execute the requested bulk action
  switch (bulkAction.action) {
    case 'extend':
      if (!bulkAction.expires_at) {
        throw new Error('Expiration date is required for extend action');
      }
      
      ({ error } = await getSupabaseClient()
        .from('allowed_visitors')
        .update({
          expires_at: bulkAction.expires_at,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .in('id', bulkAction.ids));
      break;
      
    case 'revoke':
      ({ error } = await getSupabaseClient()
        .from('allowed_visitors')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', bulkAction.ids));
      break;
      
    case 'delete':
      ({ error } = await getSupabaseClient()
        .from('allowed_visitors')
        .delete()
        .in('id', bulkAction.ids));
      break;
      
    default:
      throw new Error(`Unknown bulk action: ${bulkAction.action}`);
  }
  
  if (error) {
    console.error(`Error performing ${bulkAction.action} bulk action:`, error);
    throw new Error(`Failed to perform ${bulkAction.action} action`);
  }
  
  return true;
}

/**
 * Verify a visitor access code
 */
export async function verifyAccessCode(accessCode: string): Promise<Visitor | null> {
  if (!accessCode) {
    return null;
  }
  
  const now = new Date().toISOString();
  
  const { data, error } = await getSupabaseClient()
    .from('allowed_visitors')
    .select('*')
    .eq('access_code', accessCode)
    .eq('is_active', true)
    .gt('expires_at', now)
    .single();
  
  if (error || !data) {
    console.log('Access code validation failed:', error || 'No matching visitor found');
    return null;
  }
  
  // Update last_used timestamp
  await getSupabaseClient()
    .from('allowed_visitors')
    .update({
      last_used: now
    })
    .eq('id', data.id);
  
  return data as Visitor;
}

/**
 * Generate a random 6-digit access code
 */
export function generateRandomCode(): string {
  // Generate a random 6-digit number
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Calculate expiration date from option
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

/**
 * Inactivate a visitor (revoke access)
 */
export async function inactivateVisitor(session: Session, visitorId: string): Promise<boolean> {
  if (!session?.user?.id) {
    console.error('No user ID in session for inactivateVisitor');
    throw new Error('Authentication required');
  }
  
  // First check if this visitor belongs to the member through their address
  const { data: visitorCheck, error: checkError } = await getSupabaseClient()
    .from('member_visitors_view')
    .select('id')
    .eq('id', visitorId)
    .eq('member_id', session.user.id)
    .single();
  
  if (checkError || !visitorCheck) {
    console.error('Error inactivating visitor - ownership check failed:', checkError);
    throw new Error('Visitor not found or access denied');
  }
  
  const { error } = await getSupabaseClient()
    .from('allowed_visitors')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', visitorId);
  
  if (error) {
    console.error('Error inactivating visitor:', error);
    throw new Error('Failed to inactivate visitor');
  }
  
  return true;
}