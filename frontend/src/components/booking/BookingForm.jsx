import { useState } from 'react'
import { bookingAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CalendarPlus, Eye, Loader } from 'lucide-react'

const RESOURCE_TYPES = {
  college: ['classroom', 'lab', 'seminar_hall'],
  hospital: ['ward', 'icu', 'ot', 'consultation'],
  hostel: ['room'],
  lodge: ['room'],
}

const FACILITIES = ['projector', 'computers', 'ac', 'whiteboard', 'audio_system']

export default function BookingForm({ orgType, onSuccess }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    resource_type: RESOURCE_TYPES[orgType]?.[0] || 'classroom',
    required_capacity: 1,
    date: today,
    time_slot: { start: '09:00', end: '11:00' },
    purpose: '',
    priority: 'medium',
    justification: '',
    required_facilities: [],
    block: '',
    department: '',
  })
  const [loading, setLoading] = useState(false)
  const [showAvailable, setShowAvailable] = useState(false)
  const [availableRooms, setAvailableRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)

  const toggleFacility = (f) => {
    setForm(prev => ({
      ...prev,
      required_facilities: prev.required_facilities.includes(f)
        ? prev.required_facilities.filter(x => x !== f)
        : [...prev.required_facilities, f],
    }))
  }

  const showAvailableRooms = async () => {
    setLoadingRooms(true)
    try {
      const filters = {
        resource_type: form.resource_type,
        min_capacity: form.required_capacity,
        date: form.date,
        time_start: form.time_slot.start,
        time_end: form.time_slot.end,
      }
      if (orgType === 'college') {
        filters.facilities = form.required_facilities
        if (form.block) filters.block = form.block
      }
      if (orgType === 'hospital' && form.department) {
        filters.department = form.department
      }
      const res = await bookingAPI.availableRooms(orgType, filters)
      setAvailableRooms(res.data || [])
      setShowAvailable(true)
      if (!res.data || res.data.length === 0) {
        toast('No empty rooms available for the selected criteria', { icon: 'ℹ️' })
      }
    } catch (err) {
      console.error('Available rooms error:', err.response?.data || err.message)
      const detail = err.response?.data?.detail || err.message || 'Could not load available rooms'
      toast.error(typeof detail === 'string' ? detail : 'Could not load available rooms')
    } finally {
      setLoadingRooms(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await bookingAPI.create(form)
      const status = res.data.status
      toast.success(status === 'approved' ? 'Booking approved automatically!' : 'Booking request submitted for approval')
      onSuccess?.()
      setForm(f => ({ ...f, purpose: '', justification: '' }))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Resource Type</label>
          <select className="input" value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}>
            {(RESOURCE_TYPES[orgType] || ['classroom']).map(t => (
              <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Required Capacity</label>
          <input type="number" min="1" className="input" value={form.required_capacity}
            onChange={e => setForm(f => ({ ...f, required_capacity: +e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" min={today} value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Start Time</label>
          <input type="time" className="input" value={form.time_slot.start}
            onChange={e => setForm(f => ({ ...f, time_slot: { ...f.time_slot, start: e.target.value } }))} required />
        </div>
        <div>
          <label className="label">End Time</label>
          <input type="time" className="input" value={form.time_slot.end}
            onChange={e => setForm(f => ({ ...f, time_slot: { ...f.time_slot, end: e.target.value } }))} required />
        </div>
      </div>

      {orgType === 'college' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Block (optional)</label>
            <input className="input" placeholder="e.g. Block A" value={form.block}
              onChange={e => setForm(f => ({ ...f, block: e.target.value }))} />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      )}

      {orgType === 'college' && (
        <div>
          <label className="label">Required Facilities</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FACILITIES.map(f => (
              <button
                key={f} type="button"
                onClick={() => toggleFacility(f)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  form.required_facilities.includes(f)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="label">Purpose</label>
        <input className="input" placeholder="e.g. Department seminar on AI" required value={form.purpose}
          onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
      </div>

      <div>
        <label className="label">Justification <span className="text-red-500">*</span></label>
        <textarea className="input resize-none" rows={3} placeholder="Explain why you need this resource..." required
          value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} />
      </div>

      <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
        <CalendarPlus className="w-4 h-4" />
        {loading ? 'Submitting...' : 'Submit Booking'}
      </button>

      <div className="border-t pt-4">
        <button 
          type="button"
          onClick={showAvailableRooms}
          disabled={loadingRooms}
          className="btn-secondary flex items-center gap-2 w-full"
        >
          <Eye className="w-4 h-4" />
          {loadingRooms ? 'Loading...' : 'View Empty Rooms'}
        </button>
      </div>

      {showAvailable && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-900 mb-3">Available Rooms</p>
          {availableRooms.length === 0 ? (
            <p className="text-xs text-green-700">No empty rooms match your criteria</p>
          ) : (
            <div className="grid gap-2">
              {availableRooms.map(room => (
                <div key={room.id} className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {room.room_id || room.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Type: {room.resource_type?.toUpperCase() || 'Unknown'} · Capacity: {room.capacity}
                      </p>
                      {room.block && <p className="text-xs text-gray-500">Block: {room.block}</p>}
                      {room.facilities?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {room.facilities.map(f => (
                            <span key={f} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
