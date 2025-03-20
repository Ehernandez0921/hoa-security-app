import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { MemberAddressCreateParams, MemberAddressUpdateParams, MemberAddressFilterParams } from '@/app/models/member/Address';

// Helper function to get the appropriate Supabase client
const getSupabaseClient = () => {
  if (supabaseAdmin) {
    console.log('Using supabaseAdmin client');
    return supabaseAdmin;
  }
  
  console.log('Falling back to regular client');
  return supabase;
};

// Helper function to validate an address with OpenStreetMap API
async function validateAddress(addressText: string): Promise<boolean> {
  if (!addressText || addressText.length < 5) {
    return false;
  }
  
  // Basic address structure check: require at least a number followed by some text
  const hasAddressStructure = /\d+\s+\w+/.test(addressText.trim());
  if (!hasAddressStructure) {
    return false;
  }
  
  // Split input into meaningful parts and ensure there are enough
  const addressParts = addressText.toLowerCase().split(/[\s,]+/).filter(part => part.length > 1);
  if (addressParts.length < 2) {
    return false; // Require at least 2 meaningful parts
  }
  
  try {
    // Nominatim API for address validation
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressText)}%20USA&format=json&addressdetails=1&limit=5`,
      {
        headers: {
          // Identify your application and provide contact info
          'User-Agent': 'Gate Security HOA App (dev-test@example.com)',
          'Accept-Language': 'en-US,en'
        },
        // Cache results to avoid hitting rate limits
        next: { revalidate: 86400 } // Cache for 24 hours
      }
    );
    
    if (!response.ok) {
      console.error(`OpenStreetMap API returned ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    
    // Address is valid if we get at least one result that includes basic address components
    if (Array.isArray(data) && data.length > 0) {
      return data.some(item => {
        // Check if address has basic components that make it likely to be a real address
        const hasRoad = !!item.address?.road || !!item.address?.pedestrian;
        const hasPlace = !!item.address?.city || !!item.address?.town || !!item.address?.village;
        const hasState = !!item.address?.state;
        const hasHouseNumber = !!item.address?.house_number;
        
        // Must have either a house number or a road plus a place or state
        const isValidStructure = (hasRoad && (hasPlace || hasState)) || hasHouseNumber;
        
        if (!isValidStructure) {
          return false;
        }
        
        // Check for minimum similarity between input and result
        // Extract the relevant address parts from the result
        const addressComponents = [
          item.address?.house_number,
          item.address?.road,
          item.address?.pedestrian,
          item.address?.city,
          item.address?.town,
          item.address?.village,
          item.address?.state
        ].filter(Boolean);
        
        // How many parts of the input match parts of the result
        let matchingPartsCount = 0;
        const normalizedAddressParts = addressParts.map(part => part.toLowerCase());
        
        for (const component of addressComponents) {
          if (!component) continue;
          
          const normalizedComponent = component.toLowerCase();
          
          // Check if any input part matches this component
          for (const part of normalizedAddressParts) {
            if (normalizedComponent.includes(part) || part.includes(normalizedComponent)) {
              matchingPartsCount++;
              break;
            }
          }
        }
        
        // Require a minimum percentage of matching parts
        return matchingPartsCount >= Math.max(2, normalizedAddressParts.length * 0.5);
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error validating address:', error);
    return false;
  }
}

// GET /api/member/addresses - Retrieve all addresses for the authenticated member
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
    const filters: MemberAddressFilterParams = {};
    
    if (searchParams.has('status')) {
      const status = searchParams.get('status');
      if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' || status === 'ALL') {
        filters.status = status;
      }
    }
    
    if (searchParams.has('sort')) {
      const sort = searchParams.get('sort');
      if (sort === 'address' || sort === 'created' || sort === 'status') {
        filters.sort = sort;
      }
    }
    
    if (searchParams.has('order')) {
      const order = searchParams.get('order');
      if (order === 'asc' || order === 'desc') {
        filters.order = order;
      }
    }
    
    // Check if we should include inactive addresses
    const includeInactive = searchParams.get('include_inactive') === 'true';
    
    // Build query
    let query = getSupabaseClient()
      .from('member_addresses')
      .select('*')
      .eq('member_id', session.user.id);
    
    // Filter by is_active unless explicitly including inactive addresses
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    // Apply filters
    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    
    // Apply sorting
    if (filters.sort) {
      const order = filters.order || 'asc';
      let sortField = 'created_at';
      
      switch (filters.sort) {
        case 'address':
          sortField = 'address';
          break;
        case 'status':
          sortField = 'status';
          break;
        case 'created':
        default:
          sortField = 'created_at';
          break;
      }
      
      query = query.order(sortField, { ascending: order === 'asc' });
    } else {
      // Default sort by created_at desc
      query = query.order('created_at', { ascending: false });
    }
    
    const { data: addresses, error } = await query;
    
    if (error) {
      throw new Error(`Error fetching addresses: ${error.message}`);
    }
    
    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error in GET /api/member/addresses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/member/addresses - Create a new address
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
    
    const addressData: MemberAddressCreateParams = await request.json();
    
    // Validate required fields
    if (!addressData.address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }
    
    // Validate address with OpenStreetMap API
    const isAddressValid = await validateAddress(addressData.address);
    if (!isAddressValid) {
      return NextResponse.json(
        { error: 'Invalid address. Please provide a valid street address.' },
        { status: 400 }
      );
    }
    
    // Ensure owner_name is set from the session if not provided
    if (!addressData.owner_name || addressData.owner_name.trim() === '') {
      addressData.owner_name = session.user.name || 'Member';
    }
    
    console.log('Creating address with data:', {
      member_id: session.user.id,
      address: addressData.address,
      apartment_number: addressData.apartment_number,
      owner_name: addressData.owner_name,
      is_primary: addressData.is_primary
    });
    
    // Check if this is the first address for the member
    const { count, error: countError } = await getSupabaseClient()
      .from('member_addresses')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', session.user.id);
    
    if (countError) {
      console.error('Error checking existing addresses:', countError);
      throw new Error(`Error checking existing addresses: ${countError.message}`);
    }
    
    // If it's the first address or explicitly set as primary, mark it as primary
    const isPrimary = (count === 0 || addressData.is_primary === true);
    
    // NOTE: The issue is likely related to RLS policies in Supabase
    // Since this is a server-side API with admin access, we need to check if we need
    // to bypass RLS or ensure our session user is properly authenticated

    try {
      // Attempt to create the address
      const { data: address, error } = await getSupabaseClient()
        .from('member_addresses')
        .insert({
          member_id: session.user.id,
          address: addressData.address,
          apartment_number: addressData.apartment_number,
          owner_name: addressData.owner_name,
          is_primary: isPrimary,
          // New addresses always start as PENDING and require admin approval
          status: 'PENDING',
          is_active: true // Ensure new addresses are active by default
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase insert error:', error);
        
        // Handle specific error cases
        if (error.code === '42501') {
          return NextResponse.json(
            { error: 'Permission denied. You do not have access to create addresses.' },
            { status: 403 }
          );
        }
        
        throw new Error(`Error creating address: ${error.message}`);
      }
      
      return NextResponse.json({ address }, { status: 201 });
    } catch (insertError) {
      console.error('Error during address insertion:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Error in POST /api/member/addresses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/member/addresses - Update an address
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
    
    const addressData: MemberAddressUpdateParams = await request.json();
    
    // Validate address ID
    if (!addressData.id) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }
    
    // Check if the address belongs to the member
    const { data: existingAddress, error: fetchError } = await getSupabaseClient()
      .from('member_addresses')
      .select('*')
      .eq('id', addressData.id)
      .eq('member_id', session.user.id)
      .single();
    
    if (fetchError || !existingAddress) {
      return NextResponse.json(
        { error: 'Address not found or you do not have permission to update it' },
        { status: 404 }
      );
    }
    
    // If changing address, validate the new address
    if (addressData.address && addressData.address !== existingAddress.address) {
      const isAddressValid = await validateAddress(addressData.address);
      if (!isAddressValid) {
        return NextResponse.json(
          { error: 'Invalid address. Please provide a valid street address.' },
          { status: 400 }
        );
      }
    }
    
    // If changing address or owner_name, reset status to PENDING for re-approval
    let updateData: any = { ...addressData };
    delete updateData.id; // Remove ID from update data
    
    if (addressData.address && addressData.address !== existingAddress.address) {
      updateData.status = 'PENDING';
    }
    
    if (addressData.owner_name && addressData.owner_name !== existingAddress.owner_name) {
      updateData.status = 'PENDING';
    }
    
    // If setting as primary, handle in DB via trigger
    
    const { data: address, error } = await getSupabaseClient()
      .from('member_addresses')
      .update(updateData)
      .eq('id', addressData.id)
      .eq('member_id', session.user.id)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Error updating address: ${error.message}`);
    }
    
    return NextResponse.json({ address });
  } catch (error) {
    console.error('Error in PUT /api/member/addresses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/member/addresses?id={addressId} - Delete an address
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
    
    const addressId = request.nextUrl.searchParams.get('id');
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }
    
    // Check if this is a primary address
    const { data: address, error: fetchError } = await getSupabaseClient()
      .from('member_addresses')
      .select('*')
      .eq('id', addressId)
      .eq('member_id', session.user.id)
      .single();
    
    if (fetchError || !address) {
      return NextResponse.json(
        { error: 'Address not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Check if this address has visitors
    const { count, error: visitorCountError } = await getSupabaseClient()
      .from('allowed_visitors')
      .select('*', { count: 'exact', head: true })
      .eq('address_id', addressId);
    
    if (visitorCountError) {
      throw new Error(`Error checking visitors: ${visitorCountError.message}`);
    }
    
    // If address has visitors, perform soft deletion by setting is_active to false
    if (count && count > 0) {
      const { error: softDeleteError } = await getSupabaseClient()
        .from('member_addresses')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId)
        .eq('member_id', session.user.id);
        
      if (softDeleteError) {
        throw new Error(`Error soft-deleting address: ${softDeleteError.message}`);
      }
      
      return NextResponse.json({ 
        success: true, 
        softDeleted: true,
        message: "Address has been deactivated because it has associated visitors."
      });
    }
    
    // Don't allow deleting the primary address if it's the only address
    if (address.is_primary) {
      const { count: totalAddresses, error: countError } = await getSupabaseClient()
        .from('member_addresses')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', session.user.id)
        .eq('is_active', true); // Only count active addresses
      
      if (countError) {
        throw new Error(`Error checking address count: ${countError.message}`);
      }
      
      if (totalAddresses && totalAddresses <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete your only address. Please add another address first.' },
          { status: 400 }
        );
      }
    }
    
    // Hard delete the address if it has no visitors
    const { error } = await getSupabaseClient()
      .from('member_addresses')
      .delete()
      .eq('id', addressId)
      .eq('member_id', session.user.id);
    
    if (error) {
      throw new Error(`Error deleting address: ${error.message}`);
    }
    
    // If this was the primary address, set another address as primary
    if (address.is_primary) {
      // Get the newest address to set as primary
      const { data: newPrimary, error: selectError } = await getSupabaseClient()
        .from('member_addresses')
        .select('*')
        .eq('member_id', session.user.id)
        .eq('is_active', true) // Only consider active addresses
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!selectError && newPrimary) {
        await getSupabaseClient()
          .from('member_addresses')
          .update({ is_primary: true })
          .eq('id', newPrimary.id);
      }
    }
    
    return NextResponse.json({ success: true, softDeleted: false });
  } catch (error) {
    console.error('Error in DELETE /api/member/addresses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 