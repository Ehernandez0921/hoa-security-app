import { Suspense } from 'react'
import ReportsClient from '@/app/components/admin/ReportsClient'

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportsClient />
    </Suspense>
  )
} 