'use client';

import { Session } from "next-auth";

/**
 * Checks if the current user has a specific role
 */
export function hasRole(session: Session | null, role: string | string[]): boolean {
  if (!session?.user?.role) {
    return false;
  }

  if (Array.isArray(role)) {
    return role.includes(session.user.role);
  }
  
  return session.user.role === role;
}

/**
 * Gets information about the authentication provider used
 */
export function getAuthProvider(session: Session | null): 'microsoft' | 'credentials' | null {
  if (!session?.user?.provider) {
    return null;
  }
  
  return session.user.provider as 'microsoft' | 'credentials';
}

export interface SessionUser {
  id: string;
  email: string;
  role: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN';
}

export interface CustomSession {
  user: SessionUser | null;
} 