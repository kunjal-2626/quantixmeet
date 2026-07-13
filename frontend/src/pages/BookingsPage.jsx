import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import BookingCard from '../components/BookingCard'

export default function BookingsPage() {
  const [bookings, setBookings] = useState([])
  const [tab, setTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get(`/bookings?status=${tab}&search=${search}`)
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tab, search])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <Link to="/bookings/new" className="btn-primary text-sm">+ New booking</Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {['upcoming','past','all'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
        <input className="input max-w-xs" placeholder="Search by title or invitee…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-600 font-medium">No bookings found</p>
          {tab === 'upcoming' && <Link to="/bookings/new" className="btn-primary inline-block mt-4 text-sm">Create booking</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => <BookingCard key={b.id} booking={b} onDelete={id => setBookings(prev => prev.filter(x => x.id !== id))} />)}
        </div>
      )}
    </div>
  )
}