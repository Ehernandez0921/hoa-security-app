import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { AddressBatchActionParams } from '@/app/models/member/Address';

// Helper function to get the appropriate Supabase client
function getClient() {
  return supabaseAdmin || supabase;
}

// POST /api/admin/addresses/batch - Perform batch operations on addresses
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
    
    const batchData: AddressBatchActionParams = await request.json();
    
    // Validate required fields
    if (!batchData.address_ids || !Array.isArray(batchData.address_ids) || batchData.address_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one address ID is required' },
        { status: 400 }
      );
    }
    
    if (!batchData.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    // Prepare update data based on action
    let updateData: Record<string, any> = {};
    
    switch (batchData.action) {
      case 'APPROVE':
        updateData.status = 'APPROVED';
        updateData.verification_status = 'VERIFIED';
        break;
        
      case 'REJECT':
        updateData.status = 'REJECTED';
        updateData.verification_status = 'INVALID';
        break;
        
      case 'VERIFY':
        if (!batchData.verification_status) {
          return NextResponse.json(
            { error: 'Verification status is required for VERIFY action' },
            { status: 400 }
          );
        }
        
        updateData.verification_status = batchData.verification_status;
        
        if (batchData.verification_notes) {
          updateData.verification_notes = batchData.verification_notes;
        }
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    // Add verification date but make verified_by optional
    updateData.verification_date = new Date().toISOString();
    
    // Only set verified_by if we're sure the user ID exists in the database
    // Skipping this field to avoid foreign key constraint errors
    // updateData.verified_by = session.user.id;
    
    const client = getClient();
    
    // Perform the update on all selected addresses
    const { data, error } = await client
      .from('member_addresses')
      .update(updateData)
      .in('id', batchData.address_ids)
      .select();
    
    if (error) {
      throw new Error(`Error updating addresses: ${error.message}`);
    }
    
    return NextResponse.json({
      message: `Successfully updated ${data.length} addresses`,
      updated_count: data.length,
      updated_addresses: data
    });
  } catch (error) {
    console.error('Error in POST /api/admin/addresses/batch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 