import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Define types for response object
interface AuthDebugResponse {
  authenticated: boolean;
  timestamp: string;
  session: Record<string, any> | null;
  supabaseConnection?: {
    success: boolean;
    error?: string;
  };
  rlsPermissions?: {
    success: boolean;
    error?: string;
    data?: Record<string, any>;
  };
  supabaseError?: {
    message: string;
    stack?: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();
    
    // Basic response with session information
    const response: AuthDebugResponse = {
      authenticated: !!session,
      timestamp: new Date().toISOString(),
      session: session ? {
        ...session,
        user: {
          ...session.user,
          // Don't expose JWT token in response
          accessToken: session.user?.accessToken ? '[REDACTED]' : null,
        },
      } : null
    };
    
    // If authenticated, check Supabase connection
    if (session?.user?.id) {
      try {
        // Test Supabase connection
        const { data: connectionTest, error: connectionError } = await supabase.from('profiles').select('count').limit(1);
        
        if (connectionError) {
          response.supabaseConnection = {
            success: false,
            error: connectionError.message
          };
        } else {
          response.supabaseConnection = {
            success: true
          };
        }
        
        // Check RLS permissions
        const { data: rlsTest, error: rlsError } = await supabase
          .from('profiles')
          .select('id, role, status')
          .eq('id', session.user.id)
          .single();
          
        if (rlsError) {
          response.rlsPermissions = {
            success: false,
            error: rlsError.message
          };
        } else {
          response.rlsPermissions = {
            success: true,
            data: rlsTest
          };
        }
      } catch (error: any) {
        response.supabaseError = {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
      }
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Debug auth API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
} 