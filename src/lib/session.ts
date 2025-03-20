import { Session } from "next-auth";
import { supabase } from "./supabase";

/**
 * Gets the Supabase profile for the currently authenticated user
 * Works with both authentication methods (Microsoft and Supabase)
 */
export async function getSupabaseProfile(session: Session | null) {
  if (!session?.user) {
    return null;
  }

  try {
    // Try to find profile by ID first if available
    if (session.user.id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error) {
        return data;
      }
      
      // If the error is a "not found" error, we'll try by email below
      if (error.code !== 'PGRST116') {
        console.error('Error fetching Supabase profile by ID:', error);
      }
    }
    
    // If ID is not available or profile not found by ID, try using email
    if (session.user.email) {
      console.log('Trying to find profile by email:', session.user.email);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', session.user.email)
        .single();
        
      if (!error) {
        return data;
      }
      
      // If the error is a "not found" error, create a profile
      if (error.code === 'PGRST116') {
        console.log('Profile not found, creating a new one for user with email:', session.user.email);
        return await createUserProfile(session);
      }
      
      console.error('Error fetching Supabase profile by email:', error);
    }
    
    return null;
  } catch (error) {
    console.error('Error in getSupabaseProfile:', error);
    return null;
  }
}

/**
 * Creates a new user profile in Supabase
 */
async function createUserProfile(session: Session | null) {
  if (!session?.user) {
    return null;
  }

  if (!session.user.email) {
    console.error('Cannot create profile: no email available in session');
    return null;
  }

  try {
    // Create basic profile with default values
    const newProfile = {
      // Use actual ID if available, otherwise generate one
      id: session.user.id || crypto.randomUUID(),
      name: session.user.name || 'Unknown',
      role: session.user.role || 'MEMBER',
      email: session.user.email,  // Store email for future lookups
      address: '', // Empty address by default
      status: 'PENDING', // Default status
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.error('Error creating Supabase profile:', error);
      return null;
    }

    console.log('Successfully created new profile:', data);
    return data;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    return null;
  }
}

/**
 * Updates user profile data in Supabase
 * Works with both authentication methods (Microsoft and Supabase)
 */
export async function updateUserProfile(
  session: Session | null, 
  profileData: Partial<{
    name: string;
    address: string;
    // Add other fields as needed
  }>
) {
  if (!session?.user) {
    console.error('No user in session during updateUserProfile call');
    return { success: false, error: 'No authenticated user' };
  }

  // We need either ID or email to find the user
  if (!session.user.id && !session.user.email) {
    console.error('No user ID or email in session during updateUserProfile call');
    return { success: false, error: 'User cannot be identified' };
  }

  try {
    // First get the profile (this will create one if needed)
    const profile = await getSupabaseProfile(session);
    
    if (!profile) {
      return { success: false, error: 'Could not retrieve or create profile' };
    }
    
    // Use the profile ID for the update
    console.log(`Updating profile ID ${profile.id} with data:`, profileData);
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

    console.log('Profile updated successfully:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateUserProfile:', error);
    return { success: false, error: error.message };
  }
}

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