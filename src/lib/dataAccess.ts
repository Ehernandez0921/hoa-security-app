import * as supabaseUtils from './supabase';
import { Profile, AllowedVisitor } from './supabase';
import { AddressSearchResult, VerifyAccessCodeParams, VisitorCheckInParams, AccessCodeVerificationResult } from '@/app/models/guard/Address';

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
      addresses: result.addresses || [],
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
export async function checkInVisitor(params: VisitorCheckInParams): Promise<{ success: boolean; error?: string; checkIn?: any }> {
  try {
    return await supabaseUtils.checkInVisitor(params);
  } catch (error) {
    console.error('Error in checkInVisitor:', error);
    return { 
      success: false, 
      error: 'Failed to check in visitor'
    };
  }
}

// Export types for convenience
export type { Profile, AllowedVisitor }; 