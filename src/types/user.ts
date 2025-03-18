export type Role = 'SYSTEM_ADMIN' | 'ADMIN' | 'MEMBER' | 'GUEST';

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
  address?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Profile extends User {
  // Additional profile-specific fields can be added here
} 