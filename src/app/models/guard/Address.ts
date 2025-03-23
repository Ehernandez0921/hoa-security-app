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
  id: string | null;
  address: string;
  apartment_number?: string;
  owner_name: string;
  member_id: string;
  allowedVisitors: VisitorInfo[];
  addressDetails?: {
    houseNumber: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  isRegistered?: boolean;
}

export interface AddressSearchResult {
  addresses: {
    id?: string;
    address: string;
    apartment_number?: string;
    owner_name?: string;
    isRegistered: boolean;
    source: 'member' | 'openstreetmap';
    details?: {
      houseNumber: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
    };
    memberInfo?: {
      id: string;
      ownerName: string;
    };
    suggestedNumber?: string;
    suggestedStreet?: string;
  }[];
  error?: string;
}

export interface VisitorCheckInParams {
  visitor_id?: string;
  first_name?: string;
  last_name?: string;
  checked_in_by: string;
  check_in_time: string;
  address_id: string | null;
  entry_method: EntryMethodType;
  notes?: string;
  unregistered_address?: string;
  is_registered_address?: boolean;
}

export type EntryMethodType = 'NAME_VERIFICATION' | 'ACCESS_CODE';

export interface VisitorCheckIn {
  id: string;
  visitor_id?: string;
  first_name?: string;
  last_name?: string;
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