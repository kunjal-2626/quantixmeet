import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function NewBookingPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title:'', date:'', start_time:'', end_time:'', invitee_name:'', invitee_email:'', notes:'' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(null)
  const [availability, setAvailability] = useState(null)
  const [checkingAvail, setCheckingAvail] = useState(false)

  function set(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    setErrors(p => ({ ...p, [key]: '' }))
    if (key === 'date' || key === 'start_time' || key === 'end_time') {
      setAvailability(null)
    }
  }

  async function checkAvailability() {
    if (!form.date || !form.start_time || !form.end_time) {
      toast.error('Please select date and time first')
      return
    }
    if (form.start_time >= form.end_time) {
      toast.error('End time must be after start time')
      return
    }
    setCheckingAvail(true)
    setAvailability(null)
    try {
      const { data } = await api.get('/bookings/availability', {
        params: { date: form.date, start_time: form.start_time, end_time: form.end_time }
      })
      setAvailability(data)
    } catch (err) {
      toast.error('Could not check availability')
    } finally {
      setCheckingAvail(false)
    }
  }

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.date) e.date = 'Date is required'
    if (!form.start_time) e.start_time = 'Start time is required'
    if (!form.end_time) e.end_time = 'End time is required'
    if (form.start_time && form.end_time && form.start_time >= form.end_time) e.end_time = 'End time must be after start time'
    if (!form.invitee_name.trim()) e.invitee_name = 'Name is required'
    if (!form.invitee_email) e.invitee_email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.invitee_email)) e.invitee_email = 'Invalid email'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const { data } = await api.post('/bookings', form)
      setCreated(data)
      toast.success('Booking created!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create booking')
    } finally { setLoading(false) }
  }

  if (created) return (
    <div className="p-8 max-w-lg">
      <div className="card text-center py-10">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Booking confirmed!</h2>
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-medium text-blue-900">{created.title}</p>
          <p className="text-sm text-blue-700">{created.date} · {created.start_time} – {created.end_time}</p>
          <p className="text-sm text-blue-700">With: {created.invitee_name}</p>
        </div>
        <a href={created.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline break-all block mb-6">{created.meeting_link}</a>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/bookings')} className="btn-secondary text-sm">View all bookings</button>
          <button onClick={() => { setCreated(null); setAvailability(null) }} className="btn-primary text-sm">New booking</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-lg">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-4">← Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New booking</h1>
      <form onSubmit={handleSubmit} className="card space-y-5">

        <div>
          <label className="label">Meeting title</label>
          <input className="input" type="text" placeholder="e.g. Product demo"
            value={form.title} onChange={e => set('title', e.target.value)} />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="label">Date</label>
          <input className="input" type="date"
            min={new Date().toISOString().split('T')[0]}
            value={form.date} onChange={e => set('date', e.target.value)} />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start time</label>
            <input className="input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            {errors.start_time && <p className="text-red-500 text-xs mt-1">{errors.start_time}</p>}
          </div>
          <div>
            <label className="label">End time</label>
            <input className="input" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            {errors.end_time && <p className="text-red-500 text-xs mt-1">{errors.end_time}</p>}
          </div>
        </div>

        {/* Availability checker */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Check availability</p>
            <button
              type="button"
              onClick={checkAvailability}
              disabled={checkingAvail}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              {checkingAvail ? 'Checking…' : 'Check slot'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">Checks your Google & Outlook calendars for conflicts</p>

          {availability && (
            <div>
              {availability.available ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-green-600 text-lg">✓</span>
                  <div>
                    <p className="text-sm font-medium text-green-700">Slot is available!</p>
                    <p className="text-xs text-green-600">No conflicts found on your calendars</p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-500 text-lg">⚠</span>
                    <p className="text-sm font-medium text-red-700">Conflict detected!</p>
                  </div>
                  <div className="space-y-2">
                    {availability.conflicts.map((c, i) => (
                      <div key={i} className="bg-white border border-red-100 rounded px-3 py-2">
                        <p className="text-xs font-medium text-red-800">{c.title}</p>
                        <p className="text-xs text-red-500">{c.calendar}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-500 mt-2">You can still book but there will be a conflict</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Invitee details</p>
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" type="text" placeholder="Full name"
                value={form.invitee_name} onChange={e => set('invitee_name', e.target.value)} />
              {errors.invitee_name && <p className="text-red-500 text-xs mt-1">{errors.invitee_name}</p>}
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="invitee@example.com"
                value={form.invitee_email} onChange={e => set('invitee_email', e.target.value)} />
              {errors.invitee_email && <p className="text-red-500 text-xs mt-1">{errors.invitee_email}</p>}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input resize-none" rows={3}
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create booking'}
        </button>
      </form>
    </div>
  )
}