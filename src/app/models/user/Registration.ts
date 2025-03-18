export interface RegistrationFormData {
  name: string;
  email: string;
  password: string;
  address: string;
}

export interface RegistrationResult {
  success: boolean;
  error?: any;
  user?: {
    id: string;
    email: string;
  };
} 