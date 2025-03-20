import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Syncs a Microsoft user with our database after successful authentication
 * This ensures that the user has a profile and appropriate role
 */
export async function syncMicrosoftUser(user: {
  id: string;
  name?: string | null;
  email?: string | null;
}) {
  try {
    if (!user.id || !user.email) {
      console.error('Invalid user data for syncing Microsoft user', user);
      return null;
    }

    console.log('Syncing Microsoft user:', user.email);

    // First, check if the user exists by email using our helper function
    const { data: exists, error: existsError } = await supabase
      .rpc('check_user_exists_by_email', { p_email: user.email });
    
    if (!existsError && exists) {
      console.log('User exists, retrieving profile...');
      
      // Get the existing profile by email
      const { data: profile, error: profileError } = await supabase
        .rpc('get_user_profile_by_email', { p_email: user.email });
      
      if (!profileError && profile && profile.length > 0) {
        console.log('Retrieved existing profile for:', user.email);
        return profile[0];
      }
    }
    
    // User doesn't exist, create a new profile
    console.log('Creating new profile for Microsoft user...');
    
    // Generate a completely new UUID for this user
    const supabaseUserId = uuidv4();
    console.log('Generated new UUID:', supabaseUserId);
    
    // Use our special RPC function to create the profile (bypasses RLS)
    const { data: newProfile, error: createError } = await supabase
      .rpc('create_microsoft_user_profile', {
        p_id: supabaseUserId,
        p_name: user.name || 'Microsoft User',
        p_email: user.email
      });
    
    if (createError) {
      console.error('Error creating Microsoft user profile:', createError);
      
      // Try the previous approaches as fallbacks
      return tryFallbackMethods(user, supabaseUserId);
    }
    
    if (newProfile && newProfile.length > 0) {
      console.log('Successfully created profile for Microsoft user:', user.email);
      return newProfile[0];
    }
    
    // If we get here, something went wrong
    console.error('Failed to create or retrieve profile for Microsoft user');
    return null;
  } catch (error) {
    console.error('Error in syncMicrosoftUser:', error);
    return null;
  }
}

/**
 * Fallback methods for creating a user profile if the primary method fails
 */
async function tryFallbackMethods(user: {
  id: string;
  name?: string | null;
  email?: string | null;
}, supabaseUserId: string) {
  // Try the original RPC function
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('create_profile_bypass_rls', {
      p_id: supabaseUserId,
      p_name: user.name || 'Microsoft User',
      p_email: user.email,
      p_role: 'MEMBER',
      p_address: 'No address provided',
      p_status: 'PENDING'
    });

  if (!rpcError && rpcData) {
    console.log('Created profile via fallback RPC');
    return rpcData;
  }
  
  // Try direct insert as final fallback
  try {
    console.log('Attempting direct insert as final fallback...');
    const { data: directData, error: directError } = await supabase
      .from('profiles')
      .insert({
        id: supabaseUserId,
        name: user.name || 'Microsoft User',
        email: user.email,
        role: 'MEMBER',
        address: 'No address provided',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (!directError && directData) {
      console.log('Created profile via direct insert');
      return directData;
    }
    
    // One final check - maybe it was created anyway
    const { data: finalCheck } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();
      
    if (finalCheck) {
      console.log('Found profile in final check');
      return finalCheck;
    }
  } catch (e) {
    console.error('All fallback methods failed:', e);
  }
  
  return null;
}

/**
 * Get the role for a Microsoft user
 * If the user doesn't exist in our database yet, it will create them with a default role
 */
export async function getMicrosoftUserRole(user: {
  id: string;
  name?: string | null;
  email?: string | null;
}): Promise<string> {
  const profile = await syncMicrosoftUser(user);
  
  if (profile && profile.role) {
    return profile.role;
  }
  
  // Default role if something went wrong
  return 'MEMBER'; // Give member role by default
} 