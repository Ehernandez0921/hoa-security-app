import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// This client is for general use, including client-side code
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create an admin client with service role key (only for server-side use)
// Note: This will only be created in server-side contexts where the service role key is available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Only create the admin client when we have a service key
// This prevents errors in client-side code
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Type definitions for profiles
export type Profile = {
  id: string;
  name: string;
  email?: string;
  role: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN';
  address: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
};

// Type definitions for allowed visitors
export type AllowedVisitor = {
  id: string;
  name: string;
  access_code: string;
  member_id: string;
  created_at: string;
  updated_at: string;
};

// Function to create a new user with Supabase
export async function createUser(email: string, password: string, userData: {
  name: string;
  address: string;
}) {
  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (authError || !authData.user) {
    console.error('Error creating user:', authError);
    return { success: false, error: authError };
  }
  
  // 2. Create the profile in the profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: authData.user.id,
        name: userData.name,
        role: 'MEMBER', // Default role for new users
        address: userData.address,
        status: 'PENDING', // New users start with PENDING status
      }
    ]);
  
  if (profileError) {
    console.error('Error creating profile:', profileError);
    return { success: false, error: profileError };
  }
  
  return { 
    success: true, 
    user: {
      id: authData.user.id,
      name: userData.name,
      email: authData.user.email,
      role: 'MEMBER'
    }
  };
}

// Function to get all profiles
export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  
  return data || [];
}

// Function to get a profile by ID
export async function getProfileById(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
}

// Function to get addresses for lookup
export async function getAddresses(searchTerm: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('address')
    .ilike('address', `%${searchTerm}%`);
  
  if (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
  
  return data?.map(profile => profile.address) || [];
}

// Function to get address details with allowed visitors
export async function getAddressDetails(address: string) {
  // First get the profile ID for the address
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, address')
    .eq('address', address)
    .single();
  
  if (profileError || !profile) {
    console.error('Error fetching profile for address:', profileError);
    return null;
  }
  
  // Then get the allowed visitors for that profile
  const { data: visitors, error: visitorsError } = await supabase
    .from('allowed_visitors')
    .select('*')
    .eq('member_id', profile.id);
  
  if (visitorsError) {
    console.error('Error fetching visitors:', visitorsError);
    return {
      address: profile.address,
      allowedVisitors: []
    };
  }
  
  return {
    address: profile.address,
    allowedVisitors: visitors.map(visitor => ({
      name: visitor.name,
      accessCode: visitor.access_code
    }))
  };
}

// Function to authenticate a user
export async function authenticateUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Error signing in:', error);
    return null;
  }
  
  // Get the user's profile with role information
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (profile) {
      return {
        id: data.user.id,
        name: profile.name,
        email: data.user.email,
        role: profile.role
      };
    }
  }
  
  return null;
} 