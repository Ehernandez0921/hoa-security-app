import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/admin/addresses/map?id={addressId} - Get map data for an address
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
    
    const addressId = request.nextUrl.searchParams.get('id');
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }
    
    // First, fetch the address
    const { data: address, error: fetchError } = await supabase
      .from('member_addresses')
      .select('*')
      .eq('id', addressId)
      .single();
    
    if (fetchError || !address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }
    
    // Now get the coordinates from OpenStreetMap
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.address)}%20USA&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'Gate Security HOA App (dev-test@example.com)',
            'Accept-Language': 'en-US,en'
          },
          next: { revalidate: 86400 } // Cache for 24 hours
        }
      );
      
      if (!response.ok) {
        throw new Error(`OpenStreetMap API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        
        // Return map visualization data
        return NextResponse.json({
          address: address.address,
          apartment_number: address.apartment_number,
          coordinates: {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          },
          boundingbox: result.boundingbox,
          display_name: result.display_name,
          place_id: result.place_id,
          osm_id: result.osm_id,
          osm_type: result.osm_type,
          attribution: "© OpenStreetMap contributors"
        });
      } else {
        return NextResponse.json(
          { 
            address: address.address,
            error: 'No coordinates found for this address'
          },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error('Error fetching map data:', error);
      return NextResponse.json(
        { 
          address: address.address,
          error: 'Failed to fetch map data'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/addresses/map:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 