/**
 * Models for the login functionality
 */

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
} 