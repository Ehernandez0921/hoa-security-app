import * as supabaseUtils from './supabase';
import { Profile, AllowedVisitor } from './supabase';
import { AddressSearchResult, VerifyAccessCodeParams, VisitorCheckInParams, AccessCodeVerificationResult } from '@/app/models/guard/Address';
import { supabaseAdmin } from '@/lib/supabase'

// This file provides a unified interface for data access to Supabase

/**
 * Interface for address details including allowed visitors
 */
export interface AddressInfo {
  address: string;
  allowedVisitors: VisitorInfo[];
}

/**
 * Interface for visitor information
 */
export interface VisitorInfo {
  name: string;
  accessCode: string;
}

/**
 * Create a new user with Supabase authentication
 */
export async function createUser(email: string, password: string, userData: {
  name: string;
}) {
  try {
    return await supabaseUtils.createUser(email, password, userData);
  } catch (error) {
    console.error('Error in createUser:', error);
    return { success: false, error };
  }
}

/**
 * Get addresses matching the search term
 */
export async function getAddresses(searchTerm: string): Promise<string[]> {
  try {
    return await supabaseUtils.getAddresses(searchTerm);
  } catch (error) {
    console.error('Error in getAddresses:', error);
    return [];
  }
}

/**
 * Get address details including allowed visitors
 */
export async function getAddressDetails(address: string): Promise<any> {
  try {
    return await supabaseUtils.getAddressDetails(address);
  } catch (error) {
    console.error('Error in getAddressDetails:', error);
    return null;
  }
}

/**
 * Authenticate a user
 */
export async function authenticateUser(email: string, password: string) {
  try {
    return await supabaseUtils.authenticateUser(email, password);
  } catch (error) {
    console.error('Error in authenticateUser:', error);
    return null;
  }
}

/**
 * Get all profiles
 */
export async function getProfiles() {
  try {
    return await supabaseUtils.getProfiles();
  } catch (error) {
    console.error('Error in getProfiles:', error);
    return [];
  }
}

/**
 * Get a profile by ID
 */
export async function getProfileById(id: string) {
  try {
    return await supabaseUtils.getProfileById(id);
  } catch (error) {
    console.error('Error in getProfileById:', error);
    return null;
  }
}

/**
 * Search for addresses with improved details (including apartment numbers)
 */
export async function searchAddresses(searchTerm: string): Promise<AddressSearchResult> {
  try {
    const result = await supabaseUtils.searchAddresses(searchTerm);
    return { 
      addresses: (result.addresses || []).map(addr => ({
        ...addr,
        isRegistered: true, // Since it's coming from the database
        source: 'member' as const // Since it's from our member database
      })),
      error: result.error || undefined 
    };
  } catch (error) {
    console.error('Error in searchAddresses:', error);
    return { 
      addresses: [],
      error: 'Failed to search addresses'
    };
  }
}

/**
 * Get address details by ID including allowed visitors
 */
export async function getAddressDetailsById(addressId: string): Promise<any> {
  try {
    return await supabaseUtils.getAddressDetailsById(addressId);
  } catch (error) {
    console.error('Error in getAddressDetailsById:', error);
    return null;
  }
}

/**
 * Verify an access code for a specific address
 */
export async function verifyAccessCode(params: VerifyAccessCodeParams): Promise<AccessCodeVerificationResult> {
  try {
    return await supabaseUtils.verifyAccessCode(params);
  } catch (error) {
    console.error('Error in verifyAccessCode:', error);
    return { 
      valid: false, 
      error: 'Failed to verify access code'
    };
  }
}

/**
 * Check in a visitor (record access)
 */
export async function checkInVisitor({ 
  visitor_id, 
  first_name,
  last_name,
  checked_in_by, 
  check_in_time,
  address_id,
  entry_method = 'NAME_VERIFICATION',
  notes,
  unregistered_address,
  address_details,
  is_registered_address = true,
  address_source,
  street_number,
  street_name
}: { 
  visitor_id?: string; 
  first_name?: string;
  last_name?: string;
  checked_in_by: string; 
  check_in_time: string;
  address_id: string | null;
  entry_method?: 'NAME_VERIFICATION' | 'ACCESS_CODE';
  notes?: string;
  unregistered_address?: string;
  address_details?: any;
  is_registered_address?: boolean;
  address_source?: string;
  street_number?: string;
  street_name?: string;
}) {
  console.log('Checking in visitor:', visitor_id || `${first_name} ${last_name}`); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for visitor check-in');
    return {
      success: false,
      error: 'Admin access required for this operation'
    };
  }
  
  try {
    // If this is a registered visitor, update their last_used timestamp
    if (visitor_id) {
      const { error: visitorError } = await supabaseAdmin
        .from('allowed_visitors')
        .update({
          last_used: check_in_time
        })
        .eq('id', visitor_id);
      
      if (visitorError) {
        console.error('Error updating visitor last_used timestamp:', visitorError);
        return {
          success: false,
          error: visitorError.message
        };
      }
    }
    
    // Insert record into visitor_check_ins table for full audit trail
    const { data: checkInData, error: checkInError } = await supabaseAdmin
      .from('visitor_check_ins')
      .insert({
        visitor_id,
        first_name,
        last_name,
        address_id,
        checked_in_by,
        check_in_time,
        entry_method,
        notes,
        unregistered_address,
        address_details,
        is_registered_address,
        address_source,
        street_number,
        street_name
      })
      .select('*')
      .single();
    
    if (checkInError) {
      console.error('Error logging visitor check-in:', checkInError);
      return {
        success: false,
        error: checkInError.message
      };
    }
    
    console.log('Successfully checked in visitor:', visitor_id || `${first_name} ${last_name}`, 'Check-in ID:', checkInData.id);
    
    return {
      success: true,
      checkIn: checkInData
    };
  } catch (error) {
    console.error('Error in checkInVisitor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}

// Export types for convenience
export type { Profile, AllowedVisitor }; 