import { NextResponse } from 'next/server'
import { verifyAccessCode } from '@/lib/dataAccess'
import { VerifyAccessCodeParams } from '@/app/models/guard/Address'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
    
    // Validate request data
    if (!data.access_code || !data.address_id) {
      return NextResponse.json(
        { error: 'Access code and address ID are required' },
        { status: 400 }
      )
    }
    
    // Prepare verification parameters
    const verifyParams: VerifyAccessCodeParams = {
      access_code: data.access_code,
      address_id: data.address_id
    }
    
    // Process verification
    const result = await verifyAccessCode(verifyParams)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in visitor access code verification:', error)
    return NextResponse.json(
      { valid: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 