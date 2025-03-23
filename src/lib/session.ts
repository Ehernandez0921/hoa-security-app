'use server';

import { Session } from "next-auth";
import { supabase, supabaseAdmin } from "./supabase";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

/**
 * Gets the Supabase profile for the currently authenticated user
 * Works with both authentication methods (Microsoft and Supabase)
 */
export async function getSupabaseProfile(session: Session | null) {
  if (!session?.user) {
    return null;
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return null;
  }

  try {
    // For OAuth users (Microsoft/Google), first check auth_mappings to get the correct Supabase UUID
    if (session.user.id && session.user.provider) {
      console.log(`Looking up auth mapping for ${session.user.provider} user:`, session.user.id);
      const { data: mapping, error: mappingError } = await supabaseAdmin
        .from('auth_mappings')
        .select('supabase_id')
        .eq('provider_id', session.user.id)
        .eq('provider', session.user.provider)
        .single();

      if (!mappingError && mapping) {
        console.log('Found auth mapping, using Supabase ID:', mapping.supabase_id);
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', mapping.supabase_id)
          .single();

        if (!error) {
          return data;
        }
        
        console.error('Error fetching profile with mapped ID:', error);
      }
    }
    
    // If no mapping found or not an OAuth user, try by email
    if (session.user.email) {
      console.log('Trying to find profile by email:', session.user.email);
      const { data, error } = await supabaseAdmin
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

  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return null;
  }

  try {
    // Create basic profile with default values
    const newProfile = {
      id: session.user.id || crypto.randomUUID(),
      name: session.user.name || 'Unknown',
      role: session.user.role || 'MEMBER',
      email: session.user.email,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
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
 */
export async function updateUserProfile(
  session: Session | null, 
  profileData: Partial<{
    name: string;
  }>
) {
  if (!session?.user) {
    console.error('No user in session during updateUserProfile call');
    return { success: false, error: 'No authenticated user' };
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client not available');
    return { success: false, error: 'Database client not available' };
  }

  try {
    const profile = await getSupabaseProfile(session);
    
    if (!profile) {
      return { success: false, error: 'Could not retrieve or create profile' };
    }
    
    console.log(`Updating profile ID ${profile.id} with data:`, profileData);
    const { data, error } = await supabaseAdmin
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

export interface SessionUser {
  id: string;
  email: string;
  role: 'MEMBER' | 'SECURITY_GUARD' | 'SYSTEM_ADMIN';
}

export interface CustomSession {
  user: SessionUser | null;
}

export async function getSession(): Promise<CustomSession | null> {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      console.error('Session error:', error);
      return null;
    }

    // Get the user's profile to include role information
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      console.error('Profile not found for user:', session.user.id);
      return null;
    }

    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: profile.role as SessionUser['role'],
      },
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
} 