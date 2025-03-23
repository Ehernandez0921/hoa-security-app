import { NextResponse } from 'next/server'
import { checkInVisitor } from '@/lib/dataAccess'
import { VisitorCheckInParams } from '@/app/models/guard/Address'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // Verify that the user is authenticated and has the appropriate role
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to perform this action' },
        { status: 401 }
      )
    }
    
    // Check if the user has the SECURITY_GUARD role
    if (session.user?.role !== 'SECURITY_GUARD' && session.user?.role !== 'SYSTEM_ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to perform this action' },
        { status: 403 }
      )
    }
    
    // Parse the request body
    const data = await req.json()
    
    // Validate request data - allow null address_id for unregistered addresses
    if (data.address_id === undefined) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      )
    }

    // Check if this is a registered or non-registered visitor check-in
    if (!data.visitor_id && (!data.first_name || !data.last_name)) {
      return NextResponse.json(
        { error: 'Either visitor ID or first and last name are required' },
        { status: 400 }
      )
    }
    
    // For unregistered addresses, require address string
    if (data.address_id === null) {
      if (!data.unregistered_address) {
        return NextResponse.json(
          { error: 'Unregistered address requires an address string' },
          { status: 400 }
        )
      }
    }
    
    // Prepare check-in parameters
    const checkInParams: VisitorCheckInParams = {
      visitor_id: data.visitor_id, // Optional for non-registered visitors
      first_name: data.first_name, // Required for non-registered visitors
      last_name: data.last_name,   // Required for non-registered visitors
      checked_in_by: session.user.id,
      check_in_time: new Date().toISOString(),
      address_id: data.address_id,
      entry_method: data.entry_method || 'NAME_VERIFICATION',
      notes: data.notes,
      // Include unregistered address information if provided
      ...(data.address_id === null && {
        unregistered_address: data.unregistered_address,
        is_registered_address: false
      })
    }
    
    // Process check-in
    const result = await checkInVisitor(checkInParams)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to check in visitor' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      checkIn: result.checkIn
    })
  } catch (error) {
    console.error('Error in visitor check-in:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 