import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
}

// Initialize Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface OAuthUser {
  id: string;
  name: string;
  email: string;
  provider: 'microsoft' | 'google';
}

/**
 * Updates an existing profile to APPROVED status if it's PENDING
 */
async function ensureProfileApproved(profileId: string) {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('id', profileId)
      .single();

    if (profile && profile.status === 'PENDING') {
      console.log('Updating profile status to APPROVED');
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'APPROVED' })
        .eq('id', profileId);

      if (error) {
        console.error('Error updating profile status:', error);
      }
    }
  } catch (error) {
    console.error('Error in ensureProfileApproved:', error);
  }
}

/**
 * Creates or retrieves a user profile for OAuth users (Microsoft or Google)
 */
export async function syncOAuthUser(user: OAuthUser) {
  try {
    console.log(`Syncing ${user.provider} user: ${user.email}`);

    // First check if we have an existing auth mapping
    const { data: existingMapping, error: mappingError } = await supabaseAdmin
      .from('auth_mappings')
      .select('supabase_id')
      .eq('provider', user.provider)
      .eq('provider_id', user.id)
      .single();

    if (existingMapping) {
      // If we have a mapping, get the profile using the Supabase ID
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingMapping.supabase_id)
        .single();

      if (profile) {
        console.log(`Retrieved existing profile via mapping for: ${user.email}`);
        // Ensure the profile is approved
        await ensureProfileApproved(profile.id);
        return profile;
      }
    }

    // If no mapping exists or profile not found, check by email
    const { data: existingProfile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single();

    if (selectError) {
      console.error('Error checking for existing profile:', selectError);
    }

    if (existingProfile) {
      console.log(`Retrieved existing profile by email for: ${user.email}`);
      
      // Create auth mapping for existing profile
      await createAuthMapping(user, existingProfile.id);
      
      // Ensure the profile is approved
      await ensureProfileApproved(existingProfile.id);
      
      return existingProfile;
    }

    console.log(`Creating new profile for ${user.provider} user...`);
    const userId = uuidv4();
    console.log(`Generated new UUID: ${userId}`);

    // Create new profile using RPC function to bypass RLS
    const { data: newProfile, error: rpcError } = await supabaseAdmin.rpc(
      'create_profile_bypass_rls',
      {
        p_id: userId,
        p_name: user.name,
        p_email: user.email,
        p_role: 'MEMBER',
        p_status: 'APPROVED'
      }
    );

    if (rpcError) {
      console.error(`Error creating ${user.provider} user profile via RPC:`, rpcError);
      
      // Attempt direct insert as fallback
      console.log('Attempting direct insert as fallback...');
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          name: user.name,
          email: user.email,
          role: 'MEMBER',
          status: 'APPROVED'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error in fallback insert:', insertError);
        throw insertError;
      }

      console.log('Successfully created profile via direct insert:', insertData);

      // Create auth mapping
      await createAuthMapping(user, userId);

      return insertData;
    }

    // If RPC was successful
    console.log('Successfully created profile via RPC:', newProfile);

    // Create auth mapping
    await createAuthMapping(user, userId);

    return newProfile;

  } catch (error) {
    console.error('Error in syncOAuthUser:', error);
    throw error;
  }
}

/**
 * Creates a mapping between the OAuth provider ID and Supabase UUID
 */
async function createAuthMapping(user: OAuthUser, supabaseId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('auth_mappings')
      .insert({
        provider_id: user.id,
        supabase_id: supabaseId,
        provider: user.provider,
        email: user.email
      });

    if (error) {
      console.error('Error creating auth mapping:', error);
    } else {
      console.log('Successfully created auth mapping for:', user.email);
    }
  } catch (error) {
    console.error('Exception in createAuthMapping:', error);
  }
}

/**
 * Ensures an auth mapping exists for the user
 */
async function ensureAuthMapping(user: OAuthUser) {
  try {
    // Check if mapping exists
    const { data: existingMapping, error: checkError } = await supabaseAdmin
      .from('auth_mappings')
      .select('*')
      .eq('provider', user.provider)
      .eq('provider_id', user.id)
      .single();

    if (checkError) {
      console.error('Error checking existing auth mapping:', checkError);
    }

    if (!existingMapping) {
      // Get Supabase ID from profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single();

      if (profileError) {
        console.error('Error getting profile for auth mapping:', profileError);
      }

      if (profile) {
        await createAuthMapping(user, profile.id);
      }
    }
  } catch (error) {
    console.error('Exception in ensureAuthMapping:', error);
  }
}

/**
 * Gets a user's Supabase ID from their OAuth provider ID
 */
export async function getSupabaseId(providerId: string, provider: 'microsoft' | 'google') {
  const { data, error } = await supabaseAdmin
    .from('auth_mappings')
    .select('supabase_id')
    .eq('provider', provider)
    .eq('provider_id', providerId)
    .single();

  if (error) {
    console.error('Error getting Supabase ID:', error);
  }

  return data?.supabase_id;
} 