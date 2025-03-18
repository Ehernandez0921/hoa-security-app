import { Session } from "next-auth";
import { supabase } from "./supabase";

/**
 * Gets the Supabase profile for the currently authenticated user
 * Works with both authentication methods (Microsoft and Supabase)
 */
export async function getSupabaseProfile(session: Session | null) {
  if (!session?.user?.id) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching Supabase profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getSupabaseProfile:', error);
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
  if (!session?.user?.id) {
    return { success: false, error: 'No authenticated user' };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...profileData,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }

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