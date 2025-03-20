import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { bulkVisitorAction } from '@/lib/visitorAccess';
import { VisitorBulkAction } from '@/app/models/member/Visitor';

// POST /api/member/visitors/bulk - Apply bulk actions to multiple visitors
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
    
    const bulkAction: VisitorBulkAction = await request.json();
    
    // Validate bulk action
    if (!bulkAction.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }
    
    if (!bulkAction.ids || !Array.isArray(bulkAction.ids) || bulkAction.ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one visitor ID is required' },
        { status: 400 }
      );
    }
    
    // Validate action type
    if (!['extend', 'revoke', 'delete'].includes(bulkAction.action)) {
      return NextResponse.json(
        { error: 'Invalid action type. Must be one of: extend, revoke, delete' },
        { status: 400 }
      );
    }
    
    // For extend action, expiration date is required
    if (bulkAction.action === 'extend' && !bulkAction.expires_at) {
      return NextResponse.json(
        { error: 'Expiration date is required for extend action' },
        { status: 400 }
      );
    }
    
    // Apply bulk action
    try {
      const result = await bulkVisitorAction(session, bulkAction);
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error performing bulk action:', error);
      
      // Handle special error cases
      if (error instanceof Error) {
        const message = error.message;
        
        // Partial success case - some visitors deleted, others couldn't be
        if (message.includes('visitors were deleted, but') && message.includes('could not be deleted')) {
          return NextResponse.json(
            { 
              error: message, 
              code: 'PARTIAL_SUCCESS',
              action: bulkAction.action 
            },
            { status: 207 } // 207 Multi-Status
          );
        }
        
        // All visitors have check-in records
        if (message.includes('Cannot delete visitors with check-in history')) {
          return NextResponse.json(
            { 
              error: message, 
              code: 'VISITORS_HAVE_CHECK_INS',
              action: bulkAction.action
            },
            { status: 409 } // 409 Conflict
          );
        }
      }
      
      // Generic error
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/member/visitors/bulk:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}