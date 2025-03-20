import { NextResponse } from 'next/server'
import { searchAddresses } from '@/lib/dataAccess'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    console.log('Address search API called');
    
    // Verify that the user is authenticated and has the appropriate role
    const session = await getServerSession(authOptions)
    
    console.log('Session:', session?.user?.role);
    
    if (!session) {
      console.log('No session found, returning 401');
      return NextResponse.json(
        { error: 'You must be signed in to perform this action' },
        { status: 401 }
      )
    }
    
    // Check if the user has the SECURITY_GUARD role
    // Temporarily allow all roles for testing
    /*
    if (session.user?.role !== 'SECURITY_GUARD' && session.user?.role !== 'SYSTEM_ADMIN') {
      console.log('User does not have permission, returning 403');
      return NextResponse.json(
        { error: 'You do not have permission to perform this action' },
        { status: 403 }
      )
    }
    */
    
    // Parse the search term from the URL
    const url = new URL(req.url)
    const searchTerm = url.searchParams.get('q')
    
    console.log('Search term:', searchTerm);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      console.log('Search term too short, returning 400');
      return NextResponse.json(
        { addresses: [], error: 'Search term must be at least 2 characters' },
        { status: 400 }
      )
    }
    
    // Search for addresses
    console.log('Calling searchAddresses with term:', searchTerm);
    const result = await searchAddresses(searchTerm)
    console.log('Search result:', result);
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in address search:', error)
    return NextResponse.json(
      { addresses: [], error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 