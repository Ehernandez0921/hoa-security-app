import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be signed in to perform this action' },
        { status: 401 }
      )
    }
    
    // Only system admins and security guards can access check-in logs
    if (!['SYSTEM_ADMIN', 'SECURITY_GUARD'].includes(session.user?.role || '')) {
      return NextResponse.json(
        { error: 'You do not have permission to access check-in logs' },
        { status: 403 }
      )
    }
    
    // Ensure we have the admin client
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Admin access required for this operation' },
        { status: 500 }
      )
    }
    
    // Parse query parameters
    const url = new URL(req.url)
    const visitorId = url.searchParams.get('visitorId')
    const addressId = url.searchParams.get('addressId')
    const guardId = url.searchParams.get('guardId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    
    // Build query
    let query = supabaseAdmin
      .from('visitor_check_ins')
      .select(`
        id,
        visitor_id,
        address_id,
        checked_in_by,
        check_in_time,
        entry_method,
        notes,
        created_at
      `)
      .order('check_in_time', { ascending: false })
    
    // Security guards can only view their own check-ins
    if (session.user?.role === 'SECURITY_GUARD') {
      query = query.eq('checked_in_by', session.user.id)
    } 
    // If an admin and guardId is provided, filter by that guard
    else if (guardId) {
      query = query.eq('checked_in_by', guardId)
    }
    
    // Apply additional filters if provided
    if (visitorId) {
      query = query.eq('visitor_id', visitorId)
    }
    
    if (addressId) {
      query = query.eq('address_id', addressId)
    }
    
    if (startDate) {
      query = query.gte('check_in_time', startDate)
    }
    
    if (endDate) {
      query = query.lte('check_in_time', endDate)
    }
    
    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    query = query.range(from, to)
    
    // Execute the query
    const { data: logs, error } = await query
    
    if (error) {
      console.error('Error fetching check-in logs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch check-in logs' },
        { status: 500 }
      )
    }
    
    // Return the logs
    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Error in check-in logs API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 