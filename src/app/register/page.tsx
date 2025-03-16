'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // In production, send to your API
    // For now, just redirect
    router.push('/login')
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Register as Member</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Name</label>
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Email</label>
          <input
            type="email"
            className="w-full border p-2 rounded"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input
            type="password"
            className="w-full border p-2 rounded"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required
          />
        </div>
        <div>
          <label className="block mb-1">Address</label>
          <input
            type="text"
            className="w-full border p-2 rounded"
            value={formData.address}
            onChange={e => setFormData({...formData, address: e.target.value})}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Register
        </button>
      </form>
    </div>
  )
} 