import { NextResponse } from 'next/server'
import { getAddressDetailsById } from '@/lib/dataAccess'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
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
    
    // Parse the address ID from the URL
    const url = new URL(req.url)
    const addressId = url.searchParams.get('id')
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      )
    }
    
    // Get address details
    const result = await getAddressDetailsById(addressId)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching address details:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 