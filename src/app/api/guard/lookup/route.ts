import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Database } from '@/types/supabase';

// OpenStreetMap Nominatim API endpoint
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

interface AddressResult {
  id?: string;
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

export const dynamic = 'force-dynamic'

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

    console.log('Search params:', { query, includeUnregistered });

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Search for registered addresses first
    console.log('Searching registered addresses for:', query);
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

    console.log('Registered addresses found:', registeredAddresses);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const results: AddressResult[] = registeredAddresses.map(addr => ({
      id: addr.id,
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

    console.log('Mapped registered addresses:', results);

    // Search OpenStreetMap if includeUnregistered is true or no registered addresses found
    if ((includeUnregistered || results.length === 0) && query.length > 3) {
      console.log('Searching OpenStreetMap with params:', { query, includeUnregistered, hasRegisteredResults: results.length > 0 });
      
      // Use structured search instead of q parameter to avoid API error
      const [houseNumber, ...streetParts] = query.trim().split(' ');
      const street = streetParts.join(' ');
      
      // Focus search around exact Pharr area coordinates
      // SW: 26.1554722, -98.1905
      // NE: 26.1662500, -98.1720833
      const nominatimUrl = `${NOMINATIM_API}?format=json&street=${encodeURIComponent(street)}&housenumber=${encodeURIComponent(houseNumber)}&city=Pharr&state=Texas&postalcode=78577&countrycodes=us&viewbox=-98.1905,26.1554722,-98.1720833,26.1662500&bounded=1&limit=10`;
      
      console.log('Fetching from OpenStreetMap:', nominatimUrl);
      
      try {
        const osmResponse = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'HOA Security System/1.0',
            'Accept-Language': 'en'
          }
        });

        console.log('OpenStreetMap response status:', osmResponse.status);

        if (osmResponse.ok) {
          const osmData = await osmResponse.json();
          console.log('Raw OpenStreetMap response:', JSON.stringify(osmData, null, 2));
          
          // Transform OSM results with no filtering - all results are valid addresses
          const osmAddresses = osmData.map((item: any) => {
            // Log the raw item for debugging
            console.log('Processing item:', {
              display_name: item.display_name,
              name: item.name,
              type: item.type,
              class: item.class,
              address: item.address
            });

            // Get the street name from the item name or address components
            let streetName = '';
            if (item.address && item.address.road) {
              streetName = item.address.road;
            } else if (item.name) {
              streetName = item.name;
            } else {
              // Try to extract from display_name
              const parts = item.display_name.split(',').map((p: string) => p.trim());
              if (parts.length > 1) {
                streetName = parts[1]; // Second part usually contains the street name
              }
            }
            
            console.log('Extracted components:', {
              houseNumber,
              streetName,
              originalQuery: query
            });
            
            const suggestedAddress = {
              houseNumber,
              street: streetName,
              city: 'Pharr',
              state: 'Texas',
              postalCode: '78577'
            };
            
            // Construct a clean address string
            const addressParts = [];
            if (suggestedAddress.houseNumber) addressParts.push(suggestedAddress.houseNumber);
            if (suggestedAddress.street) addressParts.push(suggestedAddress.street);
            if (suggestedAddress.city) addressParts.push(suggestedAddress.city);
            if (suggestedAddress.state) addressParts.push(suggestedAddress.state);
            if (suggestedAddress.postalCode) addressParts.push(suggestedAddress.postalCode);
            
            const fullAddress = addressParts.join(', ');
            console.log('Final constructed address:', { 
              suggestedAddress,
              fullAddress 
            });
            
            return {
              id: null,
              address: fullAddress,
              isRegistered: false,
              source: 'openstreetmap' as const,
              details: {
                ...suggestedAddress,
                lat: item.lat,
                lon: item.lon
              }
            };
          });

          console.log('Transformed OpenStreetMap addresses:', osmAddresses);

          // Only add OSM results that don't match registered addresses
          const registeredAddressSet = new Set(results.map(r => r.address.toLowerCase()));
          const uniqueOsmAddresses = osmAddresses.filter(
            (addr: AddressResult) => !registeredAddressSet.has(addr.address.toLowerCase())
          );
          
          console.log('Unique OSM addresses:', uniqueOsmAddresses);
          
          results.push(...uniqueOsmAddresses);
        } else {
          const errorText = await osmResponse.text();
          console.error('OpenStreetMap API error:', errorText);
        }
      } catch (error) {
        console.error('Error fetching from OpenStreetMap:', error);
      }
    } else {
      console.log('Skipping OpenStreetMap search:', { 
        includeUnregistered, 
        queryLength: query.length, 
        hasRegisteredResults: results.length > 0 
      });
    }

    // Calculate if we found any registered addresses
    const hasRegisteredAddress = results.some(result => result.isRegistered);

    // Sort results to ensure registered addresses appear first
    results.sort((a, b) => {
      if (a.isRegistered === b.isRegistered) return 0;
      return a.isRegistered ? -1 : 1;
    });

    console.log('Final results:', { 
      totalResults: results.length,
      hasRegisteredAddress,
      results 
    });

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