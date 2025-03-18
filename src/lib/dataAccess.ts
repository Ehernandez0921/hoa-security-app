import * as supabaseUtils from './supabase';
import { Profile, AllowedVisitor } from './supabase';

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
  address: string;
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
export async function getAddressDetails(address: string): Promise<AddressInfo | null> {
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

// Export types for convenience
export type { Profile, AllowedVisitor }; 