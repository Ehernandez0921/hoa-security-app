import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_SETUP_SECRET = process.env.ADMIN_SETUP_SECRET || 'change-this-in-production';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const { userEmail, secret } = await request.json();
    
    // Validate the secret to ensure this is a legitimate admin setup request
    if (secret !== ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid setup secret' },
        { status: 401 }
      );
    }
    
    // Validate that the email was provided
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Bad Request - Email is required' },
        { status: 400 }
      );
    }
    
    // Find the user by email
    const { data: user, error: findError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('email', userEmail.toLowerCase())
      .single();
    
    if (findError || !user) {
      return NextResponse.json(
        { error: 'Not Found - User with this email does not exist' },
        { status: 404 }
      );
    }
    
    // Update the user's role to SYSTEM_ADMIN
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: 'SYSTEM_ADMIN',
        // If the user is in PENDING status, also approve them
        status: user.status === 'PENDING' ? 'APPROVED' : user.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select('id, email, role, status')
      .single();
    
    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json(
        { error: 'Internal Server Error - Failed to update user role' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `User ${userEmail} has been promoted to SYSTEM_ADMIN`,
      user: updatedUser
    });
    
  } catch (error) {
    console.error('Admin setup error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 