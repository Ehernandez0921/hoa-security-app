import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AdminAddressUpdateParams } from '@/app/models/member/Address';

// GET /api/admin/addresses - Retrieve all addresses for admin to approve/reject
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user has SYSTEM_ADMIN role
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }
    
    // Get filter parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    const memberId = searchParams.get('member_id') || undefined;
    
    // Build query
    let query = supabase
      .from('member_addresses')
      .select(`
        *,
        profiles:member_id (
          id,
          name,
          email
        )
      `);
    
    // Filter by status if not 'ALL'
    if (status !== 'ALL') {
      query = query.eq('status', status);
    }
    
    // Filter by member if specified
    if (memberId) {
      query = query.eq('member_id', memberId);
    }
    
    // Order by created_at (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data: addresses, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching addresses: ${error.message}`);
    }
    
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error in GET /api/admin/addresses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/addresses - Update address status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user has SYSTEM_ADMIN role
    if (session.user.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }
    
    const addressData: AdminAddressUpdateParams = await request.json();
    
    // Validate required fields
    if (!addressData.id || !addressData.status) {
      return NextResponse.json(
        { error: 'Address ID and status are required' },
        { status: 400 }
      );
    }
    
    // Ensure status is valid
    if (addressData.status !== 'APPROVED' && addressData.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Status must be either APPROVED or REJECTED' },
        { status: 400 }
      );
    }
    
    // Update address status
    const { data: address, error } = await supabase
      .from('member_addresses')
      .update({
        status: addressData.status
      })
      .eq('id', addressData.id)
      .select(`
        *,
        profiles:member_id (
          id,
          name,
          email
        )
      `)
      .single();
    
    if (error) {
      throw new Error(`Error updating address: ${error.message}`);
    }
    
    return NextResponse.json({ address });
  } catch (error) {
    console.error('Error in PUT /api/admin/addresses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 