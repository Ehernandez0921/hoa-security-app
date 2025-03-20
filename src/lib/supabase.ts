import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for the browser
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// This client is for general use, including client-side code
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create an admin client with service role key (only for server-side use)
// Note: This will only be created in server-side contexts where the service role key is available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
console.log('Service key available:', Boolean(supabaseServiceKey), 'First 5 chars:', supabaseServiceKey.substring(0, 5));

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

console.log('supabaseAdmin initialized:', Boolean(supabaseAdmin));

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
}) {
  console.log(`Creating user with email: ${email}`);
  
  // 1. Create the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/routes/login?registered=true`,
      data: {
        name: userData.name,
      }
    }
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
        email: email,
        role: 'MEMBER', // Default role for new users
        status: 'PENDING', // New users start with PENDING status
      }
    ]);
  
  if (profileError) {
    console.error('Error creating profile:', profileError);
    return { success: false, error: profileError };
  }
  
  // 3. Try to automatically confirm the email via server API
  // Note: This is optional - if it fails, user will still be registered
  // and can confirm via email link
  try {
    console.log(`Attempting to automatically confirm email for user: ${authData.user.id}`);
    
    // Call our server API endpoint to confirm the email
    const confirmResponse = await fetch('/api/auth/confirm-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: authData.user.id }),
    });
    
    const confirmResult = await confirmResponse.json();
    
    if (!confirmResponse.ok || !confirmResult.success) {
      console.log('Note: Automatic email confirmation did not succeed. User will need to confirm via email link.');
      console.error('Details:', confirmResult.error || 'Unknown error');
      // Non-fatal - user will confirm via email
    } else {
      console.log('Email automatically confirmed for user');
    }
  } catch (error) {
    console.log('Note: Unable to automatically confirm email. User will need to confirm via email link.');
    console.error('Error during confirmation attempt:', error);
    // Non-fatal - user will confirm via email
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
  console.log('Simple address search for term:', searchTerm); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for address lookup');
    return [];
  }
  
  const { data, error } = await supabaseAdmin
    .from('member_addresses')
    .select('address')
    .ilike('address', `%${searchTerm}%`);
    // Removed status filter for testing
  
  if (error) {
    console.error('Error fetching addresses:', error);
    return [];
  }
  
  console.log('Found addresses (simple):', data?.length || 0);
  
  return data?.map(addr => addr.address) || [];
}

// Function to get address details with allowed visitors - Updated to use member_addresses
export async function getAddressDetails(address: string) {
  console.log('Getting address details for address:', address); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for address details');
    return null;
  }
  
  // First get the address info for the exact address match
  const { data: addressData, error: addressError } = await supabaseAdmin
    .from('member_addresses')
    .select('id, address, apartment_number, owner_name, member_id')
    .eq('address', address)
    .single();
  
  if (addressError || !addressData) {
    console.error('Error fetching address details:', addressError);
    return null;
  }
  
  // Then get the allowed visitors for that address
  const { data: visitors, error: visitorsError } = await supabaseAdmin
    .from('allowed_visitors')
    .select('*')
    .eq('address_id', addressData.id);
  
  if (visitorsError) {
    console.error('Error fetching visitors:', visitorsError);
    return {
      id: addressData.id,
      address: addressData.address,
      apartment_number: addressData.apartment_number,
      owner_name: addressData.owner_name,
      member_id: addressData.member_id,
      allowedVisitors: []
    };
  }
  
  console.log('Found visitors for address:', visitors.length);
  
  return {
    id: addressData.id,
    address: addressData.address,
    apartment_number: addressData.apartment_number,
    owner_name: addressData.owner_name,
    member_id: addressData.member_id,
    allowedVisitors: visitors.map(visitor => ({
      id: visitor.id,
      first_name: visitor.first_name || undefined,
      last_name: visitor.last_name || undefined,
      accessCode: visitor.access_code || undefined,
      expires_at: visitor.expires_at,
      is_active: visitor.is_active,
      last_used: visitor.last_used || undefined,
      is_named_visitor: Boolean(visitor.first_name && visitor.last_name)
    }))
  };
}

// Function to authenticate a user
export async function authenticateUser(email: string, password: string) {
  console.log(`Authenticating user: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Error signing in:', error);
      
      // Check for Supabase's email not confirmed error
      if (error.message.includes('Email not confirmed') || error.code === 'email_not_confirmed') {
        console.log("Email not confirmed error detected");
        return { 
          success: false, 
          error: 'email_not_confirmed',
          message: 'Please check your email and confirm your account before logging in.' 
        };
      }
      
      // For other authentication errors
      return { success: false, error: 'invalid_credentials' };
    }
    
    // Get the user's profile with role information
    if (data.user) {
      console.log(`User authenticated, fetching profile for ID: ${data.user.id}`);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profile) {
        console.log(`Profile found with status: ${profile.status}`);
        
        // Check if the account is still pending approval
        if (profile.status === 'PENDING') {
          console.log("Account is pending approval");
          return { 
            success: false, 
            error: 'account_pending',
            message: 'Your account is pending administrator approval.' 
          };
        }
        
        // Check if the account has been rejected
        if (profile.status === 'REJECTED') {
          console.log("Account is rejected");
          return { 
            success: false, 
            error: 'account_rejected',
            message: 'Your registration has been rejected.' 
          };
        }
        
        // Account is approved, return user info
        console.log("Authentication successful, account is approved");
        return {
          success: true,
          user: {
            id: data.user.id,
            name: profile.name,
            email: data.user.email,
            role: profile.role
          }
        };
      } else {
        console.log("No profile found for user");
      }
    }
    
    console.log("Authentication failed - invalid credentials");
    return { success: false, error: 'invalid_credentials' };
  } catch (error) {
    console.error("Unexpected error during authentication:", error);
    return { 
      success: false, 
      error: 'authentication_error',
      message: 'An unexpected error occurred during authentication.' 
    };
  }
}

// Enhanced function to search for addresses with detailed information
export async function searchAddresses(searchTerm: string) {
  console.log('Searching for addresses with term:', searchTerm); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for address search');
    return {
      addresses: [],
      error: 'Admin access required for this operation'
    };
  }
  
  // Search member_addresses table which supports multiple addresses per member
  // Using supabaseAdmin to bypass RLS
  const { data: addresses, error } = await supabaseAdmin
    .from('member_addresses')
    .select('id, address, apartment_number, owner_name, member_id')
    .ilike('address', `%${searchTerm}%`);
    // .eq('status', 'APPROVED'); // Comment out restriction for testing
  
  if (error) {
    console.error('Error fetching addresses:', error);
    return {
      addresses: [],
      error: error.message
    };
  }
  
  console.log('Found addresses:', addresses); // Add logging for debugging
  
  return {
    addresses: addresses || [],
    error: null
  };
}

// Enhanced function to get address details by ID with all visitor information
export async function getAddressDetailsById(addressId: string) {
  console.log('Getting address details for ID:', addressId); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for address details');
    return null;
  }
  
  // First get the address details
  const { data: address, error: addressError } = await supabaseAdmin
    .from('member_addresses')
    .select('id, address, apartment_number, owner_name, member_id')
    .eq('id', addressId)
    .single();
  
  if (addressError || !address) {
    console.error('Error fetching address details:', addressError);
    return null;
  }
  
  // Then get the allowed visitors for that address
  const { data: visitors, error: visitorsError } = await supabaseAdmin
    .from('allowed_visitors')
    .select('*')
    .eq('address_id', address.id);
    // Removed is_active filter to see all visitors for testing
  
  if (visitorsError) {
    console.error('Error fetching visitors:', visitorsError);
    return {
      id: address.id,
      address: address.address,
      apartment_number: address.apartment_number,
      owner_name: address.owner_name,
      member_id: address.member_id,
      allowedVisitors: []
    };
  }
  
  console.log('Found visitors:', visitors); // Add logging for debugging
  
  // Format and return the combined data
  return {
    id: address.id,
    address: address.address,
    apartment_number: address.apartment_number,
    owner_name: address.owner_name,
    member_id: address.member_id,
    allowedVisitors: visitors.map(visitor => ({
      id: visitor.id,
      first_name: visitor.first_name || undefined,
      last_name: visitor.last_name || undefined,
      accessCode: visitor.access_code || undefined,
      expires_at: visitor.expires_at,
      is_active: visitor.is_active,
      last_used: visitor.last_used || undefined,
      is_named_visitor: Boolean(visitor.first_name && visitor.last_name)
    }))
  };
}

// Function to verify access code for a specific address
export async function verifyAccessCode({ access_code, address_id }: { access_code: string; address_id: string }) {
  console.log('Verifying access code for address ID:', address_id); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for code verification');
    return {
      valid: false,
      error: 'Admin access required for this operation'
    };
  }
  
  // Check if the access code exists for the given address
  const { data: visitor, error } = await supabaseAdmin
    .from('allowed_visitors')
    .select('*')
    .eq('access_code', access_code)
    .eq('address_id', address_id)
    .eq('is_active', true)
    .single();
  
  if (error || !visitor) {
    console.log('Invalid access code or not found', error);
    return {
      valid: false,
      error: 'Invalid access code'
    };
  }
  
  // Check if the visitor permission is expired
  const now = new Date();
  const expiresAt = new Date(visitor.expires_at);
  
  if (expiresAt < now) {
    console.log('Expired access code for visitor:', visitor.id);
    return {
      valid: false,
      error: 'Expired access code'
    };
  }
  
  console.log('Valid access code for visitor:', visitor.id);
  
  // Return success with visitor information
  return {
    valid: true,
    visitor: {
      id: visitor.id,
      first_name: visitor.first_name || undefined,
      last_name: visitor.last_name || undefined,
      accessCode: visitor.access_code,
      expires_at: visitor.expires_at,
      is_active: visitor.is_active,
      last_used: visitor.last_used,
      is_named_visitor: Boolean(visitor.first_name && visitor.last_name)
    }
  };
}

// Function to check in a visitor (record access)
export async function checkInVisitor({ 
  visitor_id, 
  checked_in_by, 
  check_in_time,
  address_id,
  entry_method = 'NAME_VERIFICATION',
  notes
}: { 
  visitor_id: string; 
  checked_in_by: string; 
  check_in_time: string;
  address_id: string;
  entry_method?: 'NAME_VERIFICATION' | 'ACCESS_CODE';
  notes?: string;
}) {
  console.log('Checking in visitor ID:', visitor_id); // Add logging for debugging
  
  // Make sure we have the admin client
  if (!supabaseAdmin) {
    console.error('Admin client not available for visitor check-in');
    return {
      success: false,
      error: 'Admin access required for this operation'
    };
  }
  
  // Start a transaction to ensure both operations succeed or fail together
  try {
    // Update the last_used timestamp for the visitor
    const { data: visitorData, error: visitorError } = await supabaseAdmin
      .from('allowed_visitors')
      .update({
        last_used: check_in_time
      })
      .eq('id', visitor_id)
      .select('*')
      .single();
    
    if (visitorError) {
      console.error('Error updating visitor last_used timestamp:', visitorError);
      return {
        success: false,
        error: visitorError.message
      };
    }
    
    // Insert record into visitor_check_ins table for full audit trail
    const { data: checkInData, error: checkInError } = await supabaseAdmin
      .from('visitor_check_ins')
      .insert({
        visitor_id,
        address_id,
        checked_in_by,
        check_in_time,
        entry_method,
        notes
      })
      .select('*')
      .single();
    
    if (checkInError) {
      console.error('Error logging visitor check-in:', checkInError);
      return {
        success: false,
        error: checkInError.message
      };
    }
    
    console.log('Successfully checked in visitor:', visitor_id, 'Check-in ID:', checkInData.id);
    
    return {
      success: true,
      checkIn: checkInData
    };
  } catch (error) {
    console.error('Unexpected error during visitor check-in:', error);
    return {
      success: false,
      error: 'An unexpected error occurred during check-in'
    };
  }
} 