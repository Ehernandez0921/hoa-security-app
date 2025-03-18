import { supabase } from './supabase';
import { Database } from './types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AllowedVisitor = Database['public']['Tables']['allowed_visitors']['Row'];

export const DatabaseService = {
  // Profile operations
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async searchAddresses(query: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('address', `%${query}%`)
      .limit(10);
    
    if (error) throw error;
    return data;
  },

  // Allowed visitors operations
  async getAllowedVisitors(memberId: string): Promise<AllowedVisitor[]> {
    const { data, error } = await supabase
      .from('allowed_visitors')
      .select('*')
      .eq('member_id', memberId);
    
    if (error) throw error;
    return data;
  },

  async addAllowedVisitor(visitorData: Omit<AllowedVisitor, 'id' | 'created_at' | 'updated_at'>): Promise<AllowedVisitor> {
    const { data, error } = await supabase
      .from('allowed_visitors')
      .insert([visitorData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removeAllowedVisitor(visitorId: string): Promise<void> {
    const { error } = await supabase
      .from('allowed_visitors')
      .delete()
      .eq('id', visitorId);
    
    if (error) throw error;
  },

  // Admin operations
  async assignSecurityGuardRole(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'SECURITY_GUARD' })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateMemberStatus(userId: string, status: 'APPROVED' | 'REJECTED'): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
}; 