'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type ReportType = 'visitor-activity' | 'address-verification' | 'guard-activity' | 
                  'member-activity' | 'unregistered-access' | 'access-code-usage' | 
                  'system-usage';

type DateRange = 'today' | 'this-week' | 'this-month' | 'custom';

interface ReportConfig {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'visitor-activity',
    title: 'Visitor Activity Report',
    description: 'Track all visitor check-ins, including registered and unregistered visitors',
    icon: '👥'
  },
  {
    id: 'address-verification',
    title: 'Address Verification Report',
    description: 'View address verification status, history, and details',
    icon: '🏠'
  },
  {
    id: 'guard-activity',
    title: 'Security Guard Activity Report',
    description: 'Monitor guard performance and check-in patterns',
    icon: '👮'
  },
  {
    id: 'member-activity',
    title: 'Member Activity Report',
    description: 'Track member address and visitor management activity',
    icon: '📊'
  },
  {
    id: 'unregistered-access',
    title: 'Unregistered Access Report',
    description: 'Analyze patterns in unregistered visitor access',
    icon: '🔍'
  },
  {
    id: 'access-code-usage',
    title: 'Access Code Usage Report',
    description: 'Monitor access code creation and usage patterns',
    icon: '🔑'
  },
  {
    id: 'system-usage',
    title: 'System Usage Analytics',
    description: 'View system-wide usage patterns and metrics',
    icon: '📈'
  }
];

export default function ReportsClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('this-month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv' | 'pdf'>('excel')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Security check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated' && session?.user?.role !== 'SYSTEM_ADMIN') {
      router.push('/')
    }
  }, [status, session, router])

  const handleGenerateReport = async () => {
    if (!selectedReport) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        report: selectedReport,
        dateRange,
        format: exportFormat,
        ...(dateRange === 'custom' && {
          startDate: customStartDate,
          endDate: customEndDate
        })
      });

      const response = await fetch(`/api/admin/reports/generate?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate report');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReport}-${new Date().toISOString()}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Reports Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (status === 'authenticated' && session?.user?.role === 'SYSTEM_ADMIN') {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Reports Dashboard</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {REPORTS.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`p-6 bg-white shadow rounded cursor-pointer transition-all ${
                selectedReport === report.id 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:shadow-md'
              }`}
            >
              <div className="text-2xl mb-2">{report.icon}</div>
              <h2 className="text-xl font-semibold mb-2">{report.title}</h2>
              <p className="text-gray-600">{report.description}</p>
            </div>
          ))}
        </div>

        {selectedReport && (
          <div className="bg-white shadow rounded p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Report Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="w-full border rounded p-2"
                >
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full border rounded p-2"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'excel' | 'csv' | 'pdf')}
                  className="w-full border rounded p-2"
                >
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 ${
                loading ? 'cursor-wait' : ''
              }`}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
} 