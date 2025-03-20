export interface MemberAddress {
  id: string;
  member_id: string;
  address: string;
  apartment_number?: string;
  owner_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  verification_status?: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW';
  verification_notes?: string;
  verification_date?: string;
  verified_by?: string;
}

export type MemberAddressCreateParams = {
  address: string;
  apartment_number?: string;
  owner_name: string;
  is_primary?: boolean;
}

export type MemberAddressUpdateParams = {
  id: string;
  address?: string;
  apartment_number?: string;
  owner_name?: string;
  is_primary?: boolean;
}

export interface MemberAddressFilterParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';
  sort?: 'address' | 'created' | 'status';
  order?: 'asc' | 'desc';
}

export interface AdminAddressUpdateParams {
  id: string;
  status: 'APPROVED' | 'REJECTED';
  notes?: string;
  verification_status?: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW';
  verification_notes?: string;
}

export interface AddressVerificationDetails {
  address_id: string;
  components: {
    street_number?: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  verification_status: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW';
  verified_by?: string;
  verification_date?: string;
  verification_notes?: string;
  original_address: string;
  standardized_address?: string;
}

export interface AddressBatchActionParams {
  address_ids: string[];
  action: 'APPROVE' | 'REJECT' | 'VERIFY';
  verification_status?: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW';
  verification_notes?: string;
  status?: 'APPROVED' | 'REJECTED';
} 