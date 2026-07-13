import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [calendars, setCalendars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/calendars').then(r => setCalendars(r.data)).catch(() => {}).finally(() => setLoading(false))
    const connected = searchParams.get('connected')
    if (connected) { toast.success(`${connected.charAt(0).toUpperCase()+connected.slice(1)} Calendar connected!`); setSearchParams({}) }
  }, [])

  async function disconnect(id, provider) {
    try { await api.delete(`/calendars/${id}`); setCalendars(prev => prev.filter(c => c.id !== id)); toast.success(`${provider} disconnected`) }
    catch { toast.error('Failed to disconnect') }
  }

  const googleCal = calendars.find(c => c.provider === 'google')
  const outlookCal = calendars.find(c => c.provider === 'outlook')

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Manage your profile and connected calendars.</p>
      <div className="card mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">{user?.name?.charAt(0).toUpperCase()}</div>
          <div><p className="font-medium text-gray-900">{user?.name}</p><p className="text-sm text-gray-500">{user?.email}</p></div>
        </div>
      </div>
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Calendar integrations</h2>
        <p className="text-sm text-gray-500 mb-5">Connect your calendars to automatically add bookings.</p>
        {loading ? <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div> : (
          <div className="space-y-4">
            {[{icon:'🔵',name:'Google Calendar',provider:'google',cal:googleCal},{icon:'🟦',name:'Outlook Calendar',provider:'outlook',cal:outlookCal}].map(({icon,name,provider,cal}) => (
              <div key={provider} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    {cal && <p className="text-xs text-gray-500">{cal.calendar_email}</p>}
                  </div>
                </div>
                {cal ? (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Connected
                    </span>
                    <button onClick={() => disconnect(cal.id, name)} className="text-xs text-gray-400 hover:text-red-500">Disconnect</button>
                  </div>
                ) : (
                  <button onClick={() => { const t = localStorage.getItem('access_token'); window.location.href = `http://localhost:8000/api/auth/${provider}/connect?token=${t}` }} className="btn-secondary text-xs px-3 py-1.5">Connect</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}