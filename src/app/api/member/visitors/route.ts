import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getMemberVisitors, 
  createVisitor, 
  updateVisitor, 
  deleteVisitor 
} from '@/lib/visitorAccess';
import { VisitorCreateParams, VisitorUpdateParams, VisitorFilterParams } from '@/app/models/member/Visitor';

export const dynamic = 'force-dynamic'

// GET /api/member/visitors - Retrieve all visitors for the authenticated member
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
    
    // Get filter parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const filters: VisitorFilterParams = {};
    
    if (searchParams.has('search')) {
      filters.search = searchParams.get('search') || undefined;
    }
    
    if (searchParams.has('status')) {
      const status = searchParams.get('status');
      if (status === 'active' || status === 'expired' || status === 'all') {
        filters.status = status;
      }
    }
    
    if (searchParams.has('sort')) {
      const sort = searchParams.get('sort');
      if (sort === 'name' || sort === 'created' || sort === 'expires') {
        filters.sort = sort;
      }
    }
    
    if (searchParams.has('order')) {
      const order = searchParams.get('order');
      if (order === 'asc' || order === 'desc') {
        filters.order = order;
      }
    }
    
    const visitors = await getMemberVisitors(session, filters);
    
    return NextResponse.json({ visitors });
  } catch (error) {
    console.error('Error in GET /api/member/visitors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/member/visitors - Create a new visitor
export async function POST(request: NextRequest) {
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
    
    const visitorData: VisitorCreateParams = await request.json();
    
    // Validate required fields
    if (!visitorData.expires_at) {
      return NextResponse.json(
        { error: 'Expiration date is required' },
        { status: 400 }
      );
    }
    
    // For named visitors, require both first and last name
    if (!visitorData.generate_code && (!visitorData.first_name || !visitorData.last_name)) {
      return NextResponse.json(
        { error: 'First name and last name are required for named visitors' },
        { status: 400 }
      );
    }
    
    const visitor = await createVisitor(session, visitorData);
    
    return NextResponse.json({ visitor }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/member/visitors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/member/visitors - Update a visitor
export async function PUT(request: NextRequest) {
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
    
    const visitorData: VisitorUpdateParams = await request.json();
    
    // Validate visitor ID
    if (!visitorData.id) {
      return NextResponse.json(
        { error: 'Visitor ID is required' },
        { status: 400 }
      );
    }
    
    const visitor = await updateVisitor(session, visitorData);
    
    return NextResponse.json({ visitor });
  } catch (error) {
    console.error('Error in PUT /api/member/visitors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/member/visitors?id={visitorId} - Delete a visitor
export async function DELETE(request: NextRequest) {
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
    
    const visitorId = request.nextUrl.searchParams.get('id');
    
    if (!visitorId) {
      return NextResponse.json(
        { error: 'Visitor ID is required' },
        { status: 400 }
      );
    }
    
    const result = await deleteVisitor(session, visitorId);
    
    // Return information about how the visitor was handled
    return NextResponse.json({
      success: true,
      softDeleted: result.softDeleted || false
    });
  } catch (error) {
    console.error('Error in DELETE /api/member/visitors:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}