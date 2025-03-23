import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (session.user?.role !== 'SYSTEM_ADMIN') {
      return new NextResponse('Forbidden - Requires SYSTEM_ADMIN role', { status: 403 });
    }

    // First, ensure we have a security guard
    const { data: existingGuard, error: guardError } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'SECURITY_GUARD')
      .single();

    if (guardError && guardError.code !== 'PGRST116') {
      console.error('Error checking for existing guard:', guardError);
      return new NextResponse('Error checking for existing guard', { status: 500 });
    }

    let guardId = existingGuard?.id;

    if (!guardId) {
      // Create a test security guard
      const { data: newGuard, error: createGuardError } = await supabase
        .from('profiles')
        .insert({
          name: 'Test Guard',
          email: 'testguard@example.com',
          role: 'SECURITY_GUARD'
        })
        .select()
        .single();

      if (createGuardError) {
        console.error('Error creating test guard:', createGuardError);
        return new NextResponse('Error creating test guard', { status: 500 });
      }

      guardId = newGuard.id;
    }

    // Next, ensure we have a test address
    const { data: existingAddress, error: addressError } = await supabase
      .from('member_addresses')
      .select('*')
      .eq('address', '123 Test St')
      .single();

    if (addressError && addressError.code !== 'PGRST116') {
      console.error('Error checking for existing address:', addressError);
      return new NextResponse('Error checking for existing address', { status: 500 });
    }

    let addressId = existingAddress?.id;

    if (!addressId) {
      // Create a test address
      const { data: newAddress, error: createAddressError } = await supabase
        .from('member_addresses')
        .insert({
          address: '123 Test St',
          apartment_number: '101',
          owner_name: 'Test Owner',
          is_verified: true
        })
        .select()
        .single();

      if (createAddressError) {
        console.error('Error creating test address:', createAddressError);
        return new NextResponse('Error creating test address', { status: 500 });
      }

      addressId = newAddress.id;
    }

    // Create two test check-ins
    const checkInsToCreate = [
      {
        first_name: 'John',
        last_name: 'Doe',
        check_in_time: new Date().toISOString(),
        entry_method: 'WALK_IN',
        notes: 'Test check-in 1',
        is_registered_address: true,
        checked_in_by: guardId,
        address_id: addressId
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        check_in_time: new Date().toISOString(),
        entry_method: 'WALK_IN',
        notes: 'Test check-in 2',
        is_registered_address: false,
        checked_in_by: guardId,
        unregistered_address: '456 Test Ave'
      }
    ];

    const { data: newCheckIns, error: checkInsError } = await supabase
      .from('visitor_check_ins')
      .insert(checkInsToCreate)
      .select();

    if (checkInsError) {
      console.error('Error creating test check-ins:', checkInsError);
      return new NextResponse('Error creating test check-ins', { status: 500 });
    }

    return new NextResponse(JSON.stringify({
      message: 'Test data created successfully',
      checkIns: newCheckIns
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error seeding data:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    );
  }
} 