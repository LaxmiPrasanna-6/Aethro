import { useState } from 'react'
import { bookingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Sparkles, Send } from 'lucide-react'

const EXAMPLES = [
  "I need a lab for 30 students tomorrow morning with computers and projector",
  "Book a seminar hall for 100 people next Monday afternoon",
  "Need a classroom in Block A with projector for 45 students on Friday",
]

export default function NLPBooking({ onSuccess }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      const res = await bookingAPI.nlp(text)
      setParsed(res.data.parsed_request)
      setResult(res.data.booking)
      const status = res.data.booking.status
      toast.success(status === 'approved' ? 'Auto-booked successfully!' : 'Request submitted for approval')
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'NLP booking failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-800">Natural Language Booking</span>
        </div>
        <p className="text-xs text-purple-600">Describe what you need in plain English — the system will parse and book for you.</p>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setText(ex)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors">
              {ex.substring(0, 45)}...
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          className="input resize-none flex-1" rows={3}
          placeholder='e.g. "I need a lab for 30 students tomorrow afternoon with a projector"'
          value={text} onChange={e => setText(e.target.value)} required
        />
        <button type="submit" disabled={loading || !text.trim()} className="btn-primary self-end flex items-center gap-2 whitespace-nowrap">
          <Send className="w-4 h-4" />
          {loading ? 'Processing...' : 'Auto-Book'}
        </button>
      </form>

      {parsed && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">Parsed Request:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
            <span><b>Type:</b> {parsed.resource_type}</span>
            <span><b>Capacity:</b> {parsed.required_capacity}</span>
            <span><b>Date:</b> {parsed.date}</span>
            <span><b>Time:</b> {parsed.time_slot?.start} – {parsed.time_slot?.end}</span>
            <span><b>Priority:</b> {parsed.priority}</span>
            <span><b>Facilities:</b> {parsed.required_facilities?.join(', ') || 'None'}</span>
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-xl p-4 border text-sm ${
          result.status === 'approved' ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'
        }`}>
          <p className="font-semibold">
            Status: <span className="capitalize">{result.status}</span>
            {result.waitlist_position && ` (Waitlist #${result.waitlist_position})`}
          </p>
          {result.resource_id && <p className="text-xs mt-1 text-gray-600">Resource allocated: {result.resource_id}</p>}
        </div>
      )}
    </div>
  )
}
