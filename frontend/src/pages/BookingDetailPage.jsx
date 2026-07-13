import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    api.get(`/bookings/${id}`).then(r => setBooking(r.data)).catch(() => toast.error('Not found')).finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try { await api.delete(`/bookings/${id}`); toast.success('Booking cancelled'); navigate('/bookings') }
    catch { toast.error('Failed to cancel') }
    finally { setDeleting(false) }
  }

  if (loading) return <div className="p-8"><div className="h-48 bg-gray-100 rounded-xl animate-pulse max-w-lg" /></div>
  if (!booking) return <div className="p-8 text-gray-500">Booking not found.</div>

  const statusColors = { upcoming: 'bg-green-100 text-green-700', past: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-600' }

  return (
    <div className="p-8 max-w-lg">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← Back</button>
      <div className="card space-y-5">
        <div className="flex items-start justify-between">
          <h1 className="text-xl font-bold text-gray-900">{booking.title}</h1>
          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColors[booking.status]}`}>{booking.status}</span>
        </div>
        <div className="space-y-3 text-sm">
          {[['📅','Date', new Date(booking.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})],['🕐','Time',`${booking.start_time} – ${booking.end_time}`],['👤','Invitee',`${booking.invitee_name} (${booking.invitee_email})`],booking.notes&&['📝','Notes',booking.notes]].filter(Boolean).map(([icon,label,value]) => (
            <div key={label} className="flex gap-3"><span>{icon}</span><div><p className="text-xs text-gray-400">{label}</p><p className="text-gray-800">{value}</p></div></div>
          ))}
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-1">Meeting link</p>
          <a href={booking.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline break-all">{booking.meeting_link}</a>
        </div>
        {booking.status === 'upcoming' && (
          <div className="flex gap-3 pt-2">
            <a href={booking.meeting_link} target="_blank" rel="noreferrer" className="btn-primary text-sm flex-1 text-center">Join meeting</a>
            {!confirm ? <button onClick={() => setConfirm(true)} className="btn-danger text-sm">Cancel</button>
              : <div className="flex gap-2 items-center"><span className="text-xs text-gray-600">Sure?</span>
                  <button onClick={handleDelete} disabled={deleting} className="btn-danger text-sm">{deleting ? '…' : 'Yes'}</button>
                  <button onClick={() => setConfirm(false)} className="btn-secondary text-sm">No</button></div>}
          </div>
        )}
      </div>
    </div>
  )
}