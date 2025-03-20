import { NextRequest, NextResponse } from 'next/server';

// OpenStreetMap usage policy: https://operations.osmfoundation.org/policies/nominatim/
// - Maximum 1 request per second
// - Set a valid User-Agent identifying the application
// - Provide contact information in User-Agent

// Address suggestion type
interface AddressSuggestion {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  quality?: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const addressQuery = searchParams.get('q');
    
    console.log('Address lookup query:', addressQuery);
    
    if (!addressQuery || addressQuery.length < 3) {
      console.log('Invalid query, returning 400');
      return NextResponse.json(
        { error: 'Invalid query. Please provide at least 3 characters.' },
        { status: 400 }
      );
    }
    
    try {
      // Call Nominatim API with free-text query
      // Note: Cannot mix 'q' parameter with structured parameters like 'country'
      console.log('Fetching from OpenStreetMap API with query:', addressQuery);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}%20USA&format=json&addressdetails=1&limit=10`,
        {
          headers: {
            // Identify your application and provide contact info
            'User-Agent': 'Gate Security HOA App (dev-test@example.com)',
            // Recommended to set Accept-Language for better localization
            'Accept-Language': 'en-US,en'
          },
          // Add cache options
          next: { revalidate: 86400 } // Cache for 24 hours
        }
      );
      
      if (!response.ok) {
        console.error(`OpenStreetMap API returned ${response.status}`);
        throw new Error(`OpenStreetMap API returned ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data from OpenStreetMap:', data.length, 'results');
      
      // Transform results to a standardized format
      const suggestions = data
        .map((item: any) => {
          // Extract address components
          const street = item.address?.road || item.address?.pedestrian || '';
          const houseNumber = item.address?.house_number || '';
          const city = item.address?.city || item.address?.town || item.address?.village || '';
          const state = item.address?.state || '';
          const postcode = item.address?.postcode || '';
          
          // Construct full address in standard US format
          const streetAddress = houseNumber ? `${houseNumber} ${street}` : street;
          const fullAddress = `${streetAddress}, ${city}, ${state} ${postcode}`.trim().replace(/,\s*$/, '');
          
          return {
            fullAddress,
            street: streetAddress,
            city,
            state,
            zipCode: postcode,
            // Add a quality score to help filter results
            quality: (
              (street ? 1 : 0) + 
              (houseNumber ? 1 : 0) + 
              (city ? 1 : 0) + 
              (state ? 1 : 0) + 
              (postcode ? 1 : 0)
            )
          };
        })
        // Filter out results that don't have basic address components
        .filter((item: AddressSuggestion) => item.street && (item.city || item.state))
        // Sort by quality score (higher is better)
        .sort((a: AddressSuggestion, b: AddressSuggestion) => (b.quality || 0) - (a.quality || 0))
        // Take only the top 5
        .slice(0, 5)
        // Remove quality field from final results
        .map(({ quality, ...rest }: AddressSuggestion) => rest);
      
      console.log('Returning', suggestions.length, 'transformed suggestions');
      
      // Add attribution as required by OpenStreetMap
      return NextResponse.json({
        suggestions,
        attribution: "© OpenStreetMap contributors"
      });
    } catch (error) {
      console.error('Error fetching from OpenStreetMap:', error);
      return NextResponse.json(
        { error: 'Failed to fetch address suggestions' },
        { status: 500 }
      );
    }
  } catch (outerError) {
    console.error('Unhandled error in address-lookup route:', outerError);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 