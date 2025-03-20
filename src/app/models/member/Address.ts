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
} 