import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AddressVerificationDetails } from '@/app/models/member/Address';

// GET /api/admin/addresses/verify?id={addressId} - Get detailed validation info for an address
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
    
    // First, fetch the basic address info
    const { data: address, error: fetchError } = await supabase
      .from('member_addresses')
      .select(`
        *,
        profiles:member_id (
          id,
          name,
          email
        )
      `)
      .eq('id', addressId)
      .single();
    
    if (fetchError || !address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }
    
    // Now validate the address using OpenStreetMap's Nominatim API
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.address)}%20USA&format=json&addressdetails=1&limit=1`,
        {
          headers: {
            'User-Agent': 'Gate Security HOA App (dev-test@example.com)',
            'Accept-Language': 'en-US,en'
          },
          next: { revalidate: 3600 } // Cache for 1 hour
        }
      );
      
      if (!response.ok) {
        throw new Error(`OpenStreetMap API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      let verificationDetails: AddressVerificationDetails = {
        address_id: addressId,
        components: {},
        verification_status: 'UNVERIFIED',
        original_address: address.address
      };
      
      // If we get a result back, parse it for detailed components
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        
        // Extract address components
        verificationDetails.components = {
          street_number: result.address?.house_number || '',
          street: result.address?.road || result.address?.pedestrian || '',
          city: result.address?.city || result.address?.town || result.address?.village || '',
          state: result.address?.state || '',
          zip: result.address?.postcode || '',
          country: result.address?.country || 'USA'
        };
        
        // Extract coordinates
        if (result.lat && result.lon) {
          verificationDetails.coordinates = {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          };
        }
        
        // Generate standardized address
        const { street_number, street, city, state, zip } = verificationDetails.components;
        const streetPart = street_number ? `${street_number} ${street}` : street;
        verificationDetails.standardized_address = [
          streetPart,
          city,
          `${state} ${zip}`
        ].filter(Boolean).join(', ');
        
        // Determine verification status (simple algorithm, can be enhanced)
        // Check if it has the essential components
        const hasEssentialComponents = 
          (street && (city || state)) || // Either street + city/state
          (street_number && street); // Or full street address
        
        verificationDetails.verification_status = hasEssentialComponents ? 'VERIFIED' : 'NEEDS_REVIEW';
      } else {
        // No results found - mark for review
        verificationDetails.verification_status = 'NEEDS_REVIEW';
        verificationDetails.verification_notes = 'No matches found in OpenStreetMap database.';
      }
      
      return NextResponse.json({ 
        address,
        verification: verificationDetails,
        attribution: "© OpenStreetMap contributors"
      });
    } catch (error) {
      console.error('Error validating address:', error);
      return NextResponse.json(
        { 
          address,
          verification: {
            address_id: addressId,
            components: {},
            verification_status: 'NEEDS_REVIEW',
            original_address: address.address,
            verification_notes: 'Error during address validation. Manual review required.'
          },
          error: 'Error during address validation'
        }
      );
    }
  } catch (error) {
    console.error('Error in GET /api/admin/addresses/verify:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/admin/addresses/verify - Update verification status and notes
export async function POST(request: NextRequest) {
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
    
    const verificationData = await request.json();
    
    // Validate required fields
    if (!verificationData.address_id || !verificationData.verification_status) {
      return NextResponse.json(
        { error: 'Address ID and verification status are required' },
        { status: 400 }
      );
    }
    
    // Ensure status is valid
    const validStatuses = ['VERIFIED', 'UNVERIFIED', 'INVALID', 'NEEDS_REVIEW'];
    if (!validStatuses.includes(verificationData.verification_status)) {
      return NextResponse.json(
        { error: 'Invalid verification status' },
        { status: 400 }
      );
    }
    
    // Update the address with verification details
    const { data: address, error } = await supabase
      .from('member_addresses')
      .update({
        verification_status: verificationData.verification_status,
        verification_notes: verificationData.verification_notes || null,
        verification_date: new Date().toISOString(),
        verified_by: session.user.id
      })
      .eq('id', verificationData.address_id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error updating address verification: ${error.message}`);
    }
    
    return NextResponse.json({ address });
  } catch (error) {
    console.error('Error in POST /api/admin/addresses/verify:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 