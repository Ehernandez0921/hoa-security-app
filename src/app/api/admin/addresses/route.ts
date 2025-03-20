import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AdminAddressUpdateParams } from '@/app/models/member/Address';

// Helper function to get the appropriate Supabase client
function getClient() {
  return supabaseAdmin || supabase;
}

// GET /api/admin/addresses - Retrieve all addresses for admin to approve/reject
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/addresses called');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('No authenticated user in session');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check if user has SYSTEM_ADMIN role
    if (session.user.role !== 'SYSTEM_ADMIN') {
      console.log(`User role is ${session.user.role}, not SYSTEM_ADMIN`);
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }
    
    // Get filter parameters from query string
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'PENDING';
    const memberId = searchParams.get('member_id') || undefined;
    const addressId = searchParams.get('id') || undefined;
    
    console.log(`Query parameters: status=${status}, memberId=${memberId}, addressId=${addressId}`);
    
    const client = getClient();
    
    try {
      // Test basic connection to Supabase using admin client
      const { data: testData, error: testError } = await client
        .from('member_addresses')
        .select('count(*)');
      
      if (testError) {
        console.error('Basic Supabase connection test error:', testError);
      } else {
        console.log('Basic Supabase connection test successful, row count:', testData);
      }
      
      // Get raw addresses without any filtering to check connection using admin client
      const { data: allAddresses, error: allError } = await client
        .from('member_addresses')
        .select('*');
      
      if (allError) {
        console.error('Error fetching all addresses:', allError);
      } else {
        console.log(`Raw database contains ${allAddresses.length} total addresses`);
        console.log('Status values in database:', allAddresses.map(addr => addr.status));
      }
    } catch (e) {
      console.error('Error in test queries:', e);
    }
    
    // Build query using supabaseAdmin client to bypass RLS
    let query = client
      .from('member_addresses')
      .select(`
        *,
        profiles:member_id (
          id,
          name,
          email
        )
      `);
    
    // Filter by ID if specified
    if (addressId) {
      console.log(`Filtering by address ID: ${addressId}`);
      query = query.eq('id', addressId);
    } else {
      // Filter by status if not 'ALL'
      if (status !== 'ALL') {
        console.log(`Filtering by status: ${status}`);
        // Try a more lenient match to debug
        console.log(`Using case-insensitive search for status`);
        query = query.ilike('status', `%${status}%`);
      }
      
      // Filter by member if specified
      if (memberId) {
        console.log(`Filtering by member ID: ${memberId}`);
        query = query.eq('member_id', memberId);
      }
    }
    
    // Order by created_at (newest first)
    query = query.order('created_at', { ascending: false });
    
    console.log('Executing Supabase query with admin client');
    const { data: addresses, error } = await query;
    
    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Error fetching addresses: ${error.message}`);
    }
    
    console.log(`Found ${addresses?.length || 0} addresses`);
    
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
    
    const client = getClient();
    
    // Update address status using supabaseAdmin to bypass RLS
    const { data: address, error } = await client
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