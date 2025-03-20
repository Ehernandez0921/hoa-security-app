import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateRandomCode, verifyAccessCode } from '@/lib/visitorAccess';

// GET /api/member/visitors/code - Generate a new random access code
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user has MEMBER role
    if (session.user.role !== 'MEMBER') {
      return NextResponse.json(
        { error: 'Access denied. Member role required.' },
        { status: 403 }
      );
    }
    
    // Generate a random access code
    const accessCode = generateRandomCode();
    
    return NextResponse.json({ accessCode });
  } catch (error) {
    console.error('Error in GET /api/member/visitors/code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/member/visitors/code - Verify an access code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // This endpoint is used by both MEMBER and SECURITY_GUARD roles
    if (!['MEMBER', 'SECURITY_GUARD'].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: 'Access denied. Member or Security Guard role required.' },
        { status: 403 }
      );
    }
    
    const { accessCode } = await request.json();
    
    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code is required' },
        { status: 400 }
      );
    }
    
    // Verify the access code
    const visitor = await verifyAccessCode(accessCode);
    
    if (!visitor) {
      return NextResponse.json({
        isValid: false,
        message: 'Invalid or expired access code'
      });
    }
    
    return NextResponse.json({
      isValid: true,
      visitor,
      message: 'Valid access code'
    });
  } catch (error) {
    console.error('Error in POST /api/member/visitors/code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}