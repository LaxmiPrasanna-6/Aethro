import { useState, useEffect } from 'react'
import { collegeAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Trash2, RefreshCw, Building2, Upload } from 'lucide-react'
import DocxUpload from './DocxUpload'

const RESOURCE_TYPES = ['classroom', 'lab', 'seminar_hall']
const FACILITIES_LIST = ['projector', 'computers', 'ac', 'whiteboard', 'audio_system']

export default function ResourceManager() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({
    block: '', room_id: '', resource_type: 'classroom',
    capacity: 30, facilities: [],
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await collegeAPI.getRooms()
      setRooms(res.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addRoom = async (e) => {
    e.preventDefault()
    try {
      await collegeAPI.addRoom(form)
      toast.success('Room added successfully')
      setShowForm(false)
      setForm({ block: '', room_id: '', resource_type: 'classroom', capacity: 30, facilities: [] })
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add room')
    }
  }

  const deleteRoom = async (id) => {
    if (!confirm('Delete this room?')) return
    try {
      await collegeAPI.deleteRoom(id)
      toast.success('Room deleted')
      load()
    } catch (err) {
      toast.error('Failed to delete room')
    }
  }

  const toggleFacility = (f) => {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(f)
        ? prev.facilities.filter(x => x !== f)
        : [...prev.facilities, f],
    }))
  }

  // Group rooms by block
  const byBlock = rooms.reduce((acc, r) => {
    const blk = r.block || 'General'
    if (!acc[blk]) acc[blk] = []
    acc[blk].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{rooms.length} room(s) configured</span>
        <div className="flex gap-2">
          <button onClick={load} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
          {/* Toggle between manual form and bulk upload */}
          <button
            onClick={() => { setShowUpload(!showUpload); setShowForm(false) }}
            className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg border font-medium transition-colors ${
              showUpload
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'
            }`}
          >
            <Upload className="w-4 h-4" />
            {showUpload ? 'Hide Upload' : 'Bulk Upload (.docx)'}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowUpload(false) }}
            className="btn-primary flex items-center gap-2 text-sm py-1.5"
          >
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
      </div>

      {/* Bulk .docx upload panel */}
      {showUpload && (
        <div className="border border-indigo-200 bg-white rounded-xl p-5">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            Bulk Room Upload via Word Document
          </h3>
          <DocxUpload onSuccess={() => { setShowUpload(false); load() }} />
        </div>
      )}

      {showForm && (
        <form onSubmit={addRoom} className="border border-primary-200 bg-primary-50 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm text-primary-900">Add New Room / Lab / Hall</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Block</label>
              <input className="input" placeholder="Block A" value={form.block} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} />
            </div>
            <div>
              <label className="label">Room ID</label>
              <input className="input" placeholder="A-101" required value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}>
                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Capacity</label>
            <input type="number" min="1" className="input w-32" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} />
          </div>
          <div>
            <label className="label">Facilities</label>
            <div className="flex flex-wrap gap-2">
              {FACILITIES_LIST.map(f => (
                <button key={f} type="button" onClick={() => toggleFacility(f)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.facilities.includes(f) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300'
                  }`}>{f}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm py-1.5">Save Room</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {Object.entries(byBlock).map(([block, blockRooms]) => (
        <div key={block}>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-sm text-gray-700">{block}</h3>
            <span className="text-xs text-gray-400">({blockRooms.length} rooms)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {blockRooms.map(r => (
              <div key={r.id} className={`border rounded-lg p-3 flex items-start justify-between ${r.is_available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div>
                  <p className="font-medium text-sm">{r.room_id}</p>
                  <p className="text-xs text-gray-500 capitalize">{r.resource_type.replace('_', ' ')} · Cap: {r.capacity}</p>
                  {r.facilities?.length > 0 && <p className="text-xs text-gray-400">{r.facilities.join(', ')}</p>}
                  <span className={`text-xs ${r.is_available ? 'text-green-600' : 'text-red-600'}`}>
                    {r.is_available ? '● Available' : '● Occupied'}
                  </span>
                </div>
                <button onClick={() => deleteRoom(r.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {loading && <div className="text-center py-6 text-gray-400">Loading rooms...</div>}
    </div>
  )
}
