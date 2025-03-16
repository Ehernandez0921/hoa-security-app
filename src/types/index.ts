export interface User {
  id: string;
  name: string;
  email: string;
  role: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN';
  address?: string;
}

export interface AllowedVisitor {
  id: string;
  name: string;
  accessCode: string;
  memberId: string;
}

export interface MemberRequest {
  id: string;
  name: string;
  email: string;
  address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
} 