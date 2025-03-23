import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    if (session.user?.role !== 'SYSTEM_ADMIN') {
      return new NextResponse('Forbidden - Requires SYSTEM_ADMIN role', { status: 403 });
    }

    // Ensure we have admin client
    if (!supabaseAdmin) {
      return new NextResponse('Admin client not available', { status: 500 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const report = searchParams.get('report');
    const dateRange = searchParams.get('dateRange');
    const format = searchParams.get('format');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Validate required parameters
    if (!report || !dateRange || !format) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Calculate date range
    let fromDate: Date;
    let toDate = new Date();

    switch (dateRange) {
      case 'today':
        fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        break;
      case 'this-week':
        fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - fromDate.getDay());
        fromDate.setHours(0, 0, 0, 0);
        break;
      case 'this-month':
        fromDate = new Date();
        fromDate.setDate(1);
        fromDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          return new NextResponse('Custom date range requires start and end dates', { status: 400 });
        }
        fromDate = new Date(startDate);
        toDate = new Date(endDate);
        if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          return new NextResponse('Invalid date format', { status: 400 });
        }
        break;
      default:
        return new NextResponse('Invalid date range', { status: 400 });
    }

    // Fetch report data based on type
    let data;
    switch (report) {
      case 'visitor-activity':
        console.log('Fetching visitor activity report data...');
        console.log('Date range:', { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() });
        
        // First get all check-ins without date filter to see if we have any data
        console.log('Attempting to fetch all check-ins...');
        const { data: allCheckIns, error: allCheckInsError } = await supabaseAdmin
          .from('visitor_check_ins')
          .select(`
            id,
            visitor_id,
            first_name,
            last_name,
            check_in_time,
            entry_method,
            notes,
            created_at,
            is_registered_address,
            checked_in_by,
            address_id,
            unregistered_address
          `)
          .order('check_in_time', { ascending: false });

        if (allCheckInsError) {
          console.error('Error fetching all check-ins:', allCheckInsError);
          console.error('Error details:', {
            message: allCheckInsError.message,
            details: allCheckInsError.details,
            hint: allCheckInsError.hint
          });
          return new NextResponse('Error fetching check-in data', { status: 500 });
        }

        console.log('Total check-ins in database:', allCheckIns?.length || 0);
        if (allCheckIns?.length) {
          console.log('Sample check-in:', JSON.stringify(allCheckIns[0], null, 2));
        } else {
          console.log('No check-ins found in the database at all');
        }

        // Now get check-ins within date range
        console.log('Attempting to fetch check-ins within date range...');
        console.log('Date range:', { fromDate: fromDate.toISOString(), toDate: toDate.toISOString() });
        
        const { data: checkIns, error: checkInsError } = await supabaseAdmin
          .from('visitor_check_ins')
          .select(`
            id,
            visitor_id,
            first_name,
            last_name,
            check_in_time,
            entry_method,
            notes,
            created_at,
            is_registered_address,
            checked_in_by,
            address_id,
            unregistered_address
          `)
          .gte('check_in_time', fromDate.toISOString())
          .lte('check_in_time', toDate.toISOString())
          .order('check_in_time', { ascending: false });

        if (checkInsError) {
          console.error('Error fetching filtered check-ins:', checkInsError);
          console.error('Error details:', {
            message: checkInsError.message,
            details: checkInsError.details,
            hint: checkInsError.hint
          });
          return new NextResponse('Error fetching check-in data', { status: 500 });
        }

        console.log('Check-ins found within date range:', checkIns?.length ?? 0);
        if (checkIns && checkIns.length > 0) {
          console.log('Sample check-in from date range:', JSON.stringify(checkIns[0], null, 2));
        } else {
          console.log('No check-ins found within the specified date range');
        }

        if (!checkIns?.length) {
          // Return empty report if no data
          console.log('No check-ins found within date range');
          data = [];
          break;
        }

        // Get all unique guard IDs
        const guardIds = [...new Set(checkIns.map(c => c.checked_in_by))];
        console.log('Unique guard IDs:', guardIds);
        
        // Get guard profiles
        const { data: guardProfiles, error: guardsError } = await supabaseAdmin
          .from('profiles')
          .select('id, name')
          .in('id', guardIds);

        if (guardsError) {
          console.error('Error fetching guard profiles:', guardsError);
          return new NextResponse('Error fetching guard data', { status: 500 });
        }

        console.log('Guard profiles:', guardProfiles);

        // Get all unique address IDs
        const addressIds = [...new Set(checkIns.filter(c => c.address_id).map(c => c.address_id))];
        console.log('Unique address IDs:', addressIds);
        
        // Get address details if there are any registered addresses
        let addresses: { id: string; address: string; apartment_number: string | null }[] = [];
        if (addressIds.length > 0) {
          const { data: addressData, error: addressesError } = await supabaseAdmin
            .from('member_addresses')
            .select('id, address, apartment_number')
            .in('id', addressIds);

          if (addressesError) {
            console.error('Error fetching addresses:', addressesError);
            return new NextResponse('Error fetching address data', { status: 500 });
          }
          addresses = addressData || [];
          console.log('Address details:', addresses);
        }

        // Create lookup maps
        const guardMap = new Map(guardProfiles?.map(g => [g.id, g]) || []);
        const addressMap = new Map(addresses?.map(a => [a.id, a]) || []);

        console.log('Guard map:', Object.fromEntries(guardMap));
        console.log('Address map:', Object.fromEntries(addressMap));

        // Combine data
        data = checkIns.map(checkIn => {
          const mappedData = {
            created_at: new Date(checkIn.check_in_time || checkIn.created_at).toLocaleString(),
            visitor_name: checkIn.first_name && checkIn.last_name 
              ? `${checkIn.first_name} ${checkIn.last_name}`
              : 'N/A',
            address: checkIn.address_id 
              ? addressMap.get(checkIn.address_id)?.address 
              : checkIn.unregistered_address || 'N/A',
            unit: checkIn.address_id 
              ? addressMap.get(checkIn.address_id)?.apartment_number || ''
              : '',
            guard_name: guardMap.get(checkIn.checked_in_by)?.name || 'Unknown',
            type: checkIn.is_registered_address ? 'Registered' : 'Unregistered'
          };
          console.log('Mapped check-in data:', mappedData);
          return mappedData;
        });

        console.log('Final data to be exported:', data);

        // Set up worksheet columns
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Report');
        worksheet.columns = [
          { header: 'Date', key: 'created_at', width: 20 },
          { header: 'Visitor Name', key: 'visitor_name', width: 30 },
          { header: 'Address', key: 'address', width: 40 },
          { header: 'Unit', key: 'unit', width: 15 },
          { header: 'Checked In By', key: 'guard_name', width: 30 },
          { header: 'Type', key: 'type', width: 15 }
        ];

        // Add the data rows
        worksheet.addRows(data);

        // Generate file buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Return file
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=${report}-${new Date().toISOString()}.xlsx`
          }
        });

      case 'address-verification':
        const { data: addressData, error: addressError } = await supabase
          .from('member_addresses')
          .select('*')
          .order('created_at', { ascending: false });

        if (addressError) {
          console.error('Error fetching address data:', addressError);
          return new NextResponse('Error fetching address data', { status: 500 });
        }
        data = addressData;
        break;

      // Add other report types here...

      default:
        return new NextResponse('Invalid report type', { status: 400 });
    }

    // Generate report file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers based on report type
    switch (report) {
      case 'visitor-activity':
        worksheet.columns = [
          { header: 'Date', key: 'created_at', width: 20 },
          { header: 'Visitor Name', key: 'visitor_name', width: 30 },
          { header: 'Address', key: 'address', width: 40 },
          { header: 'Unit', key: 'unit', width: 15 },
          { header: 'Checked In By', key: 'guard_name', width: 30 },
          { header: 'Type', key: 'type', width: 15 }
        ];
        worksheet.addRows(data);
        break;

      case 'address-verification':
        worksheet.columns = [
          { header: 'Address', key: 'address', width: 40 },
          { header: 'Unit', key: 'apartment_number', width: 15 },
          { header: 'Owner Name', key: 'owner_name', width: 30 },
          { header: 'Verified', key: 'is_verified', width: 15 },
          { header: 'Created At', key: 'created_at', width: 20 }
        ];
        worksheet.addRows(data.map((row: any) => ({
          ...row,
          created_at: new Date(row.created_at).toLocaleString(),
          is_verified: row.is_verified ? 'Yes' : 'No'
        })));
        break;

      // Add other report formats here...
    }

    // Generate file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${report}-${new Date().toISOString()}.xlsx`
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal server error', 
      { status: 500 }
    );
  }
} 