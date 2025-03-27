import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface UserProfile {
  id: string;
  email: string;
}

interface AuthMapping {
  provider: string;
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Log the email being searched for debugging
    console.log('Searching for email:', email);

    // First try with ilike
    const { data: userFromIlike, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    // Log the query results for debugging
    console.log('ilike query result:', { userFromIlike, queryError });

    if (queryError) {
      console.error('Error querying user:', queryError);
      return NextResponse.json(
        { error: 'Error querying user' },
        { status: 500 }
      );
    }

    // If ilike didn't work, try with lowercase comparison
    if (!userFromIlike) {
      const { data: userFromLower, error: altError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      console.log('lowercase query result:', { userFromLower, altError });

      if (!userFromLower) {
        return NextResponse.json({
          message: 'No account found with this email address. No reset instructions will be sent.',
          exists: false
        });
      }

      // Use the user found with lowercase comparison
      const user: UserProfile = userFromLower;
      return await handleUserResponse(user);
    }

    // Use the user found with ilike
    const user: UserProfile = userFromIlike;
    return await handleUserResponse(user);
  } catch (error) {
    console.error('Error in forgot password endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleUserResponse(user: UserProfile) {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not initialized');
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }

  // Check if user has an auth mapping (OAuth user)
  const { data: authMapping, error: mappingError } = await supabaseAdmin
    .from('auth_mappings')
    .select('provider')
    .eq('supabase_id', user.id)
    .maybeSingle();

  if (mappingError) {
    console.error('Error checking auth mapping:', mappingError);
    return NextResponse.json(
      { error: 'Error checking authentication method' },
      { status: 500 }
    );
  }

  // If user has an auth mapping, they are an OAuth user
  if (authMapping) {
    const provider = authMapping.provider.toLowerCase();
    return NextResponse.json({
      message: `This account uses ${provider} login. Please sign in with your ${provider} account.`,
      exists: true,
      isOAuth: true,
      provider
    });
  }

  // For email/password users, proceed with password reset
  // Use the exact email from the database to ensure correct case
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log('Base URL for reset:', baseUrl);
  
  try {
    const redirectUrl = new URL('/routes/reset-password', baseUrl);
    redirectUrl.searchParams.append('type', 'recovery');

    console.log('Reset redirect URL:', redirectUrl.toString());

    // Generate password reset link with explicit redirect URL
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(user.email, {
      redirectTo: redirectUrl.toString(),
    });

    if (error) {
      console.error('Error sending password reset email:', error);
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Password reset instructions have been sent to your email address.',
      exists: true,
      isOAuth: false
    });
  } catch (error) {
    console.error('Error creating reset URL:', error);
    return NextResponse.json(
      { error: 'Failed to create reset URL' },
      { status: 500 }
    );
  }
} 