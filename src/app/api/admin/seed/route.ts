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

    console.log('Starting seed data creation...');

    // Get a security guard ID
    const { data: guards, error: guardsError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'SECURITY_GUARD')
      .limit(1);

    if (guardsError) {
      console.error('Error finding security guard:', guardsError);
      return new NextResponse('Error finding security guard', { status: 500 });
    }

    // If no guard exists, create one
    let guardId;
    if (!guards?.length) {
      const { data: newGuard, error: newGuardError } = await supabase
        .from('profiles')
        .insert({
          name: 'Test Guard',
          role: 'SECURITY_GUARD',
          email: 'testguard@example.com',
          status: 'APPROVED'
        })
        .select()
        .single();

      if (newGuardError) {
        console.error('Error creating guard:', newGuardError);
        return new NextResponse('Error creating guard', { status: 500 });
      }
      guardId = newGuard.id;
    } else {
      guardId = guards[0].id;
    }

    console.log('Using guard ID:', guardId);

    // Get or create a test address
    const { data: addresses, error: addressesError } = await supabase
      .from('member_addresses')
      .select('id')
      .limit(1);

    let addressId;
    if (!addresses?.length) {
      const { data: newAddress, error: newAddressError } = await supabase
        .from('member_addresses')
        .insert({
          address: '123 Test St',
          owner_name: 'Test Owner',
          member_id: session.user.id,
          status: 'APPROVED',
          is_primary: true
        })
        .select()
        .single();

      if (newAddressError) {
        console.error('Error creating address:', newAddressError);
        return new NextResponse('Error creating address', { status: 500 });
      }
      addressId = newAddress.id;
    } else {
      addressId = addresses[0].id;
    }

    console.log('Using address ID:', addressId);

    // Insert test check-ins
    const { error: checkInsError } = await supabase
      .from('visitor_check_ins')
      .insert([
        {
          first_name: 'John',
          last_name: 'Doe',
          checked_in_by: guardId,
          check_in_time: new Date().toISOString(),
          entry_method: 'NAME_VERIFICATION',
          notes: 'Test check-in 1',
          address_id: addressId,
          is_registered_address: true
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          checked_in_by: guardId,
          check_in_time: new Date().toISOString(),
          entry_method: 'NAME_VERIFICATION',
          notes: 'Test check-in 2',
          unregistered_address: '456 Oak St',
          is_registered_address: false
        }
      ]);

    if (checkInsError) {
      console.error('Error inserting check-ins:', checkInsError);
      return new NextResponse('Error creating test data: ' + checkInsError.message, { status: 500 });
    }

    return new NextResponse('Test data created successfully', { status: 200 });
  } catch (error) {
    console.error('Error in seed endpoint:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    );
  }
} 