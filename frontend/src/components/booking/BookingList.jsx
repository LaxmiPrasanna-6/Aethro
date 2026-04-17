import { useState, useEffect } from 'react'
import { bookingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, X } from 'lucide-react'

const STATUS_BADGE = {
  pending: 'badge-pending',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  cancelled: 'badge-cancelled',
  reassigned: 'badge-reassigned',
  checked_in: 'badge-approved',
  no_show: 'badge-rejected',
}

export default function BookingList({ filter = 'my', showActions = false, onRefresh }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = filter === 'my' ? await bookingAPI.myBookings() : await bookingAPI.orgBookings()
      setBookings(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const cancel = async (id) => {
    try {
      await bookingAPI.cancel(id)
      toast.success('Booking cancelled')
      load()
      onRefresh?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Cancel failed')
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading bookings...</div>
  if (bookings.length === 0) return <div className="text-center py-8 text-gray-400">No bookings found.</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{bookings.length} booking(s)</span>
        <button onClick={load} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {bookings.map(b => (
        <div key={b.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={STATUS_BADGE[b.status] || 'badge-pending'}>{b.status}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  b.priority === 'high' ? 'bg-red-100 text-red-700' :
                  b.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{b.priority} priority</span>
                {b.nlp_parsed && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">NLP</span>}
              </div>
              <p className="font-medium text-sm text-gray-900">{b.purpose}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {b.date} · {b.time_slot?.start} – {b.time_slot?.end} · Capacity: {b.required_capacity}
              </p>
              {b.resource_id && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Room: <span className="font-mono font-semibold text-gray-700">{b.room_id || b.resource_id}</span>
                  {b.block ? <span className="text-gray-400"> · Block {b.block}</span> : null}
                  {b.resource_type ? <span className="text-gray-400"> · {b.resource_type.replace('_', ' ')}</span> : null}
                </p>
              )}
              {b.waitlist_position && <p className="text-xs text-amber-600 mt-0.5">Waitlist #{b.waitlist_position}</p>}
            </div>
            {showActions && ['pending', 'approved'].includes(b.status) && (
              <button onClick={() => cancel(b.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
