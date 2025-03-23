import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseProfile } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // Get session info
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'You must be signed in to access this endpoint' },
        { status: 401 }
      );
    }

    // Get profile from Supabase
    const profile = await getSupabaseProfile(session);

    // Get raw profiles table data for troubleshooting
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id);

    if (profilesError) {
      console.error('Error querying profiles table:', profilesError);
    }

    // Return all relevant info
    return NextResponse.json({
      session: {
        ...session,
        user: {
          ...session.user,
          // Don't expose JWT token in debug response
          accessToken: session.user?.accessToken ? '[REDACTED]' : null,
        },
      },
      profile,
      rawProfileData: allProfiles || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Debug profile API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 