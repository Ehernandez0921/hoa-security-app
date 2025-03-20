export interface Visitor {
  id: string;
  address_id: string;
  address?: string;
  first_name?: string;
  last_name?: string;
  access_code?: string;
  is_active: boolean;
  expires_at: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export type VisitorCreateParams = {
  address_id: string;
  first_name?: string;
  last_name?: string;
  generate_code?: boolean;
  expires_at: string;
}

export type VisitorUpdateParams = {
  id: string;
  address_id?: string;
  first_name?: string;
  last_name?: string;
  access_code?: string;
  is_active?: boolean;
  expires_at?: string;
}

export type VisitorBulkAction = {
  action: 'extend' | 'revoke' | 'delete';
  ids: string[];
  expires_at?: string;
  address_id?: string;
}

export type ExpirationOption = '24h' | '1w' | '1m' | 'custom';

export interface VisitorFilterParams {
  search?: string;
  status?: 'active' | 'expired' | 'all';
  sort?: 'name' | 'created' | 'expires';
  order?: 'asc' | 'desc';
  address_id?: string;
}

export interface VisitorCodeVerification {
  access_code: string;
  is_valid: boolean;
  visitor?: Visitor;
  message?: string;
}