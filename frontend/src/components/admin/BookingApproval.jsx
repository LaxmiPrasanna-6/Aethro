import { useState, useEffect } from 'react'
import { bookingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Check, X, RefreshCw, ArrowRight } from 'lucide-react'

export default function BookingApproval({ onUpdate }) {
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await bookingAPI.pending()
      setPending(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const act = async (id, action, reason = null) => {
    setActionLoading(id + action)
    try {
      await bookingAPI.action(id, { action, reason })
      toast.success(`Booking ${action}d`)
      load()
      onUpdate?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    }
    setActionLoading(null)
  }

  if (loading) return <div className="text-center py-6 text-gray-400">Loading...</div>
  if (pending.length === 0) return (
    <div className="text-center py-8 text-gray-400">
      <Check className="w-10 h-10 mx-auto mb-2 text-green-400" />
      <p>No pending approvals</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{pending.length} pending approval(s)</span>
        <button onClick={load} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {pending.map(b => (
        <div key={b.id} className="border border-yellow-200 bg-yellow-50 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  b.priority === 'high' ? 'bg-red-100 text-red-700' :
                  b.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-gray-100 text-gray-600'
                }`}>{b.priority}</span>
                <span className="text-xs text-gray-500 capitalize">{b.user_role}</span>
                {b.nlp_parsed && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">NLP</span>}
              </div>
              <p className="font-medium text-sm">{b.purpose}</p>
              <p className="text-xs text-gray-600 mt-0.5">{b.date} · {b.time_slot?.start}–{b.time_slot?.end} · {b.required_capacity} seats</p>
              {b.justification && <p className="text-xs text-gray-500 mt-1 italic">"{b.justification}"</p>}
              {b.required_facilities?.length > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">Facilities: {b.required_facilities.join(', ')}</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => act(b.id, 'approve')}
                disabled={actionLoading === b.id + 'approve'}
                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => act(b.id, 'reject', 'Not approved by admin')}
                disabled={actionLoading === b.id + 'reject'}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
