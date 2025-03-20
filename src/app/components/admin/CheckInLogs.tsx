'use client'

import { useState, useEffect } from 'react'
import { VisitorCheckIn, EntryMethodType } from '@/app/models/guard/Address'

interface CheckInLogsProps {
  addressId?: string
  visitorId?: string
  guardId?: string
  dateRange?: { start: string; end: string }
}

export default function CheckInLogs({ addressId, visitorId, guardId, dateRange }: CheckInLogsProps) {
  const [logs, setLogs] = useState<VisitorCheckIn[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 20

  // Format date in a user-friendly way
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get visitor check-in logs
  const fetchCheckInLogs = async (pageNumber: number = 1) => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters
      let queryParams = new URLSearchParams()
      queryParams.append('page', pageNumber.toString())
      queryParams.append('pageSize', pageSize.toString())

      if (addressId) queryParams.append('addressId', addressId)
      if (visitorId) queryParams.append('visitorId', visitorId)
      if (guardId) queryParams.append('guardId', guardId)
      if (dateRange?.start) queryParams.append('startDate', dateRange.start)
      if (dateRange?.end) queryParams.append('endDate', dateRange.end)

      const response = await fetch(`/api/admin/check-ins?${queryParams.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch check-in logs')
      }

      const data = await response.json()
      
      if (pageNumber === 1) {
        setLogs(data.logs)
      } else {
        setLogs(prevLogs => [...prevLogs, ...data.logs])
      }
      
      setHasMore(data.logs.length === pageSize)
      setPage(pageNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred fetching check-in logs')
      console.error('Error fetching check-in logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load logs when component mounts or filters change
  useEffect(() => {
    setPage(1)
    fetchCheckInLogs(1)
  }, [addressId, visitorId, guardId, dateRange])

  // Handle loading more logs
  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchCheckInLogs(page + 1)
    }
  }

  // Get a label for the entry method
  const getEntryMethodLabel = (method: EntryMethodType) => {
    switch (method) {
      case 'NAME_VERIFICATION':
        return 'Name Verification'
      case 'ACCESS_CODE':
        return 'Access Code'
      default:
        return method
    }
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="text-lg font-medium text-gray-900">Visitor Check-in Logs</h3>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 border-b border-red-100">
          {error}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visitor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Address
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Guard
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No check-in logs found.
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.check_in_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.visitor_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.address_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.checked_in_by}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      log.entry_method === 'NAME_VERIFICATION' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getEntryMethodLabel(log.entry_method)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.notes || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {isLoading && (
        <div className="px-6 py-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
          <span className="ml-2 text-gray-500">Loading...</span>
        </div>
      )}
      
      {hasMore && !isLoading && (
        <div className="px-6 py-4 text-center">
          <button 
            onClick={loadMore}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
} 