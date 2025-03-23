import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Database } from '@/types/supabase';

// OpenStreetMap Nominatim API endpoint
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

interface AddressResult {
  address: string;
  isRegistered: boolean;
  source: 'member' | 'openstreetmap';
  details?: {
    houseNumber: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  memberInfo?: {
    id: string;
    ownerName: string;
  };
  suggestedNumber?: string;
  suggestedStreet?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get session and verify guard role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== 'SECURITY_GUARD' && userRole !== 'SYSTEM_ADMIN') {
      console.error('Access denied for role:', userRole);
      return NextResponse.json({ 
        error: 'Forbidden - This endpoint requires SECURITY_GUARD or SYSTEM_ADMIN role',
        role: userRole 
      }, { status: 403 });
    }

    // Get search query from URL params
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const includeUnregistered = searchParams.get('include_unregistered') === 'true';

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Search for registered addresses first
    const { data: registeredAddresses, error: dbError } = await supabaseAdmin
      .from('member_addresses')
      .select(`
        id,
        address,
        apartment_number,
        owner_name,
        member_id,
        status
      `)
      .eq('status', 'APPROVED')
      .ilike('address', `%${query}%`)
      .limit(10);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results: AddressResult[] = registeredAddresses.map(addr => ({
      address: addr.apartment_number 
        ? `${addr.address} Apt ${addr.apartment_number}`
        : addr.address,
      isRegistered: true,
      source: 'member',
      memberInfo: {
        id: addr.member_id,
        ownerName: addr.owner_name
      }
    }));

    // If no results or includeUnregistered is true, try OpenStreetMap
    if ((results.length === 0 || includeUnregistered) && query.length > 3) {
      const nominatimUrl = `${NOMINATIM_API}?format=json&q=${encodeURIComponent(query)}&countrycodes=us&limit=5`;
      
      const osmResponse = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'HOA Security System/1.0'
        }
      });

      if (osmResponse.ok) {
        const osmData = await osmResponse.json();
        
        // Filter and transform OSM results
        const osmAddresses = osmData
          .filter((item: any) => 
            item.address?.house_number && 
            item.address?.road &&
            item.address?.city &&
            item.address?.state
          )
          .map((item: any) => ({
            address: `${item.address.house_number} ${item.address.road}, ${item.address.city}, ${item.address.state} ${item.address.postcode || ''}`,
            isRegistered: false,
            source: 'openstreetmap' as const,
            details: {
              houseNumber: item.address.house_number,
              street: item.address.road,
              city: item.address.city,
              state: item.address.state,
              postalCode: item.address.postcode || ''
            },
            suggestedNumber: item.address.house_number,
            suggestedStreet: item.address.road
          }));

        results.push(...osmAddresses);
      }
    }

    // Calculate if we found any registered addresses
    const hasRegisteredAddress = results.some(result => result.isRegistered);

    return NextResponse.json({
      results,
      totalCount: results.length,
      hasMoreResults: results.length >= 10,
      hasRegisteredAddress
    });

  } catch (error) {
    console.error('Error in address lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 