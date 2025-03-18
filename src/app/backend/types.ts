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
          role: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN'
          address: string
          status: 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role?: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN'
          address: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN'
          address?: string
          status?: 'PENDING' | 'APPROVED' | 'REJECTED'
          created_at?: string
          updated_at?: string
        }
      }
      allowed_visitors: {
        Row: {
          id: string
          name: string
          access_code: string
          member_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          access_code: string
          member_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          access_code?: string
          member_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 