import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'

const STATUS_COLORS = { upcoming:'bg-green-100 text-green-700', past:'bg-gray-100 text-gray-600', cancelled:'bg-red-100 text-red-600' }

export default function BookingCard({ booking: b, onDelete }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e) {
    e.preventDefault(); e.stopPropagation()
    setDeleting(true)
    try { await api.delete(`/bookings/${b.id}`); toast.success('Booking cancelled'); onDelete(b.id) }
    catch { toast.error('Failed to cancel') }
    finally { setDeleting(false); setConfirm(false) }
  }

  return (
    <Link to={`/bookings/${b.id}`} className="block">
      <div className="card hover:shadow-md transition-shadow flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="text-center bg-blue-50 rounded-lg px-3 py-2 shrink-0">
            <p className="text-xs font-medium text-blue-600 uppercase">{new Date(b.date+'T00:00:00').toLocaleDateString('en-US',{month:'short'})}</p>
            <p className="text-xl font-bold text-blue-700 leading-none">{new Date(b.date+'T00:00:00').getDate()}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-gray-900 truncate">{b.title}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</span>
            </div>
            <p className="text-sm text-gray-500">{b.start_time} – {b.end_time} · {b.invitee_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.preventDefault()}>
          {b.status === 'upcoming' && <a href={b.meeting_link} target="_blank" rel="noreferrer" className="btn-primary text-xs px-3 py-1.5" onClick={e => e.stopPropagation()}>Join</a>}
          {b.status === 'upcoming' && !confirm && <button className="btn-danger text-xs px-3 py-1.5" onClick={e => { e.preventDefault(); setConfirm(true) }}>Cancel</button>}
          {confirm && <div className="flex items-center gap-1">
            <button className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50" onClick={handleDelete} disabled={deleting}>{deleting ? '…' : 'Yes'}</button>
            <button className="btn-secondary text-xs px-3 py-1.5" onClick={e => { e.preventDefault(); setConfirm(false) }}>No</button>
          </div>}
        </div>
      </div>
    </Link>
  )
}
