import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import BookingCard from '../components/BookingCard'

export default function DashboardPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bookings?status=upcoming')
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id) {
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Good {greeting}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here's what's coming up for you.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{bookings.length}</p>
          <p className="text-xs text-gray-500 mt-1">Upcoming meetings</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">
            {bookings.filter(b => { const d = new Date(b.date); const n = new Date(); const w = new Date(); w.setDate(n.getDate()+7); return d >= n && d <= w }).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">This week</p>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming meetings</h2>
        <Link to="/bookings/new" className="btn-primary text-sm">+ New booking</Link>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-600 font-medium">No meetings scheduled yet</p>
          <Link to="/bookings/new" className="btn-primary inline-block mt-4 text-sm">Create booking</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.slice(0,5).map(b => <BookingCard key={b.id} booking={b} onDelete={handleDelete} />)}
          {bookings.length > 5 && <Link to="/bookings" className="block text-center text-sm text-blue-600 hover:underline mt-2">View all {bookings.length} meetings →</Link>}
        </div>
      )}
    </div>
  )
}