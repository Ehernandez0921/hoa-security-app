/**
 * Models for the guard address lookup functionality
 */

export interface VisitorInfo {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  accessCode?: string;
  expires_at: string;
  is_active: boolean;
  last_used?: string;
  is_named_visitor: boolean;
}

export interface AddressInfo {
  id: string;
  address: string;
  apartment_number?: string;
  owner_name: string;
  member_id: string;
  allowedVisitors: VisitorInfo[];
}

export interface AddressSearchResult {
  addresses: {
    id: string;
    address: string;
    apartment_number?: string;
    owner_name: string;
  }[];
  error?: string;
}

export interface VisitorCheckInParams {
  visitor_id: string;
  checked_in_by: string;
  check_in_time: string;
  address_id: string;
  entry_method: EntryMethodType;
  notes?: string;
}

export type EntryMethodType = 'NAME_VERIFICATION' | 'ACCESS_CODE';

export interface VisitorCheckIn {
  id: string;
  visitor_id: string;
  address_id: string;
  checked_in_by: string;
  check_in_time: string;
  entry_method: EntryMethodType;
  notes?: string;
  created_at: string;
}

export interface VerifyAccessCodeParams {
  access_code: string;
  address_id: string;
}

export interface AccessCodeVerificationResult {
  valid: boolean;
  visitor?: VisitorInfo;
  error?: string;
} 