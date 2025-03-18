export type User = {
  id: string
  name: string
  email?: string
  role: string
  status: string
  created_at: string
  updated_at: string
}

export type UserUpdateRequest = {
  userId: string
  field: 'role' | 'status'
  value: string
} 