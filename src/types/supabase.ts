export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN'
          status: 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN'
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN'
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at?: string
          updated_at?: string
        }
      }
      member_addresses: {
        Row: {
          id: string
          member_id: string
          address: string
          apartment_number: string | null
          owner_name: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED'
          is_primary: boolean
          is_active: boolean
          created_at: string
          updated_at: string
          verification_status: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW' | null
          verification_notes: string | null
          verification_date: string | null
          verified_by: string | null
        }
        Insert: {
          id?: string
          member_id: string
          address: string
          apartment_number?: string | null
          owner_name: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          is_primary?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
          verification_status?: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW' | null
          verification_notes?: string | null
          verification_date?: string | null
          verified_by?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          address?: string
          apartment_number?: string | null
          owner_name?: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          is_primary?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
          verification_status?: 'VERIFIED' | 'UNVERIFIED' | 'INVALID' | 'NEEDS_REVIEW' | null
          verification_notes?: string | null
          verification_date?: string | null
          verified_by?: string | null
        }
      }
      visitor_check_ins: {
        Row: {
          id: string
          visitor_id: string | null
          address_id: string | null
          checked_in_by: string
          check_in_time: string
          entry_method: string
          notes: string | null
          created_at: string
          first_name: string | null
          last_name: string | null
          unregistered_address: string | null
          address_details: Json | null
          is_registered_address: boolean
          address_source: 'member' | 'openstreetmap' | null
          original_suggestion: Json | null
          street_number: string | null
          street_name: string | null
          modified_address: boolean
        }
        Insert: {
          id?: string
          visitor_id?: string | null
          address_id?: string | null
          checked_in_by: string
          check_in_time?: string
          entry_method: string
          notes?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          unregistered_address?: string | null
          address_details?: Json | null
          is_registered_address?: boolean
          address_source?: 'member' | 'openstreetmap' | null
          original_suggestion?: Json | null
          street_number?: string | null
          street_name?: string | null
          modified_address?: boolean
        }
        Update: {
          id?: string
          visitor_id?: string | null
          address_id?: string | null
          checked_in_by?: string
          check_in_time?: string
          entry_method?: string
          notes?: string | null
          created_at?: string
          first_name?: string | null
          last_name?: string | null
          unregistered_address?: string | null
          address_details?: Json | null
          is_registered_address?: boolean
          address_source?: 'member' | 'openstreetmap' | null
          original_suggestion?: Json | null
          street_number?: string | null
          street_name?: string | null
          modified_address?: boolean
        }
      }
    }
    Views: {
      access_log_report: {
        Row: {
          id: string
          check_in_time: string
          entry_method: string
          notes: string | null
          visitor_first_name: string | null
          visitor_last_name: string | null
          access_code: string | null
          address: string | null
          apartment_number: string | null
          owner_name: string | null
          verification_status: string | null
          guard_name: string | null
          member_name: string | null
          is_registered_address: boolean
          street_number: string | null
          street_name: string | null
          address_source: string | null
          modified_address: boolean | null
          address_details: Json | null
        }
      }
    }
    Functions: {
      is_system_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_address_verified: {
        Args: { address_id: string }
        Returns: boolean
      }
    }
  }
} 