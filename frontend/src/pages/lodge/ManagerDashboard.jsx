import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import { lodgeAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Hotel, RefreshCw, UserPlus, UserMinus, UploadCloud, Download } from 'lucide-react'

const ROOM_TYPES = ['ac', 'non_ac']
const SHARING_TYPES = [1, 2, 3, 4]
const FEATURE_OPTIONS = ['WiFi', 'TV', 'Kitchen', 'Balcony', 'Attached Bath', 'Air Conditioning', 'Parking', 'Mini Bar']

function AddRoomForm({ onSuccess }) {
  const [form, setForm] = useState({
    room_id: '', 
    floor: 1,
    capacity: 1,
    room_type: 'ac', 
    sharing_type: 1, 
    food_option: false,
    features: [],
  })
  const [loading, setLoading] = useState(false)

  const toggleFeature = (feature) => setForm(f => ({
    ...f,
    features: f.features.includes(feature) 
      ? f.features.filter(x => x !== feature)
      : [...f.features, feature]
  }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await lodgeAPI.addRoom({
        room_id: form.room_id,
        floor: form.floor,
        capacity: form.capacity,
        room_type: form.room_type,
        sharing_type: form.sharing_type,
        food_option: form.food_option,
        features: form.features,
        resource_type: 'room'
      })
      toast.success('Room added')
      onSuccess()
      setForm({ room_id: '', floor: 1, capacity: 1, room_type: 'ac', sharing_type: 1, food_option: false, features: [] })
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Failed') 
    }
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3 mb-4">
      <h3 className="font-semibold text-sm text-amber-900">Add New Lodge Room</h3>
      
      {/* Row 1: Room ID, Floor, Beds */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Room ID *</label>
          <input className="input" placeholder="L-101" required value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} />
        </div>
        <div>
          <label className="label">Floor *</label>
          <input className="input" type="number" min="0" required value={form.floor} onChange={e => setForm(f => ({ ...f, floor: +e.target.value }))} />
        </div>
        <div>
          <label className="label">Beds *</label>
          <input className="input" type="number" min="1" required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} />
        </div>
      </div>

      {/* Row 2: Room Type, Sharing Type */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Room Type</label>
          <select className="input" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
            {ROOM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Sharing Type</label>
          <select className="input" value={form.sharing_type} onChange={e => setForm(f => ({ ...f, sharing_type: +e.target.value }))}>
            {SHARING_TYPES.map(n => <option key={n} value={n}>{n} Sharing</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer pt-7">
            <input type="checkbox" checked={form.food_option} onChange={e => setForm(f => ({ ...f, food_option: e.target.checked }))} className="w-4 h-4" />
            <span>Food Option</span>
          </label>
        </div>
      </div>

      {/* Row 3: Features (checkboxes) */}
      <div>
        <label className="label">Features</label>
        <div className="grid grid-cols-4 gap-2">
          {FEATURE_OPTIONS.map(feat => (
            <label key={feat} className="flex items-center gap-2 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={form.features.includes(feat)}
                onChange={() => toggleFeature(feat)}
                className="w-4 h-4"
              />
              {feat}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5">{loading ? 'Adding...' : 'Add Room'}</button>
    </form>
  )
}

function UploadDocxSection({ onSuccess }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.docx')) {
      toast.error('Only .docx files are accepted')
      return
    }
    setFile(f)
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const res = await lodgeAPI.uploadDocx(file)
      setResult({ ok: true, data: res.data })
      toast.success(res.data.message)
      onSuccess?.()
      setFile(null)
    } catch (err) {
      const detail = err.response?.data?.detail
      const data = typeof detail === 'object' ? detail : { message: String(detail || 'Upload failed') }
      setResult({ ok: false, data })
      toast.error(data.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await lodgeAPI.downloadTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lodge_room_upload_template.docx'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded')
    } catch {
      toast.error('Could not download template')
    }
  }

  const zoneClass = [
    'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
    dragOver ? 'border-primary-500 bg-primary-50 cursor-copy' :
    result?.ok ? 'border-green-400 bg-green-50' :
    result && !result.ok ? 'border-red-300 bg-red-50' :
    file ? 'border-blue-400 bg-blue-50' :
    'border-gray-300 hover:border-primary-400 hover:bg-gray-50 cursor-pointer',
  ].join(' ')

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-amber-900">Bulk Upload Rooms from Word Document</h3>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1 text-xs bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 font-medium px-2.5 py-1.5 rounded-lg"
        >
          <Download className="w-3.5 h-3.5" />
          Download Template
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={zoneClass}
      >
        <input ref={inputRef} type="file" accept=".docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {!file ? (
          <>
            <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Drag your <span className="text-primary-600 font-semibold">.docx</span> file or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">Format: Room ID, Floor, Beds, Features (one per line, separated by blank lines)</p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900">✓ {file.name}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={() => { setFile(null); setResult(null) }}
                disabled={uploading}
                className="bg-gray-300 hover:bg-gray-400 text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className={`border rounded-lg p-3 text-sm ${result.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <p className={result.ok ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
            {result.data.message || (typeof result.data.detail === 'string' ? result.data.detail : result.data.detail?.message || 'Upload failed')}
          </p>
          
          {result.ok ? (
            <>
              {result.data.created > 0 && <p className="text-xs text-green-700 mt-1">✓ Created: {result.data.created} rooms</p>}
              {result.data.skipped > 0 && <p className="text-xs text-orange-700">⊘ Skipped: {result.data.skipped} (duplicates)</p>}
              {result.data.parse_errors > 0 && <p className="text-xs text-red-700">✗ Errors: {result.data.parse_errors}</p>}
            </>
          ) : (
            <>
              {result.data.detail?.parse_errors && (
                <div className="mt-2 bg-red-100 border-l-2 border-red-600 p-2 rounded text-xs text-red-800">
                  <p className="font-semibold">Parse Errors:</p>
                  {Array.isArray(result.data.detail.parse_errors) && result.data.detail.parse_errors.slice(0, 3).map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
              {result.data.detail?.preview && (
                <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono text-gray-700 max-h-24 overflow-y-auto">
                  <p className="font-semibold">Document Preview:</p>
                  {result.data.detail.preview.slice(0, 5).map((line, i) => (
                    <p key={i}>{line || '(blank line)'}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function ManagerDashboard() {
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'rooms'
  const [rooms, setRooms] = useState([])
  const [emptyRooms, setEmptyRooms] = useState(null)
  const [summary, setSummary] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filters, setFilters] = useState({ room_type: '', food_option: null, sharing_type: null })

  const load = async () => {
    lodgeAPI.getRooms().then(r => setRooms(r.data)).catch(() => {})
    lodgeAPI.summary().then(r => setSummary(r.data)).catch(() => {})
    lodgeAPI.emptyRooms().then(r => setEmptyRooms(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const filter = async () => {
    const f = {}
    if (filters.room_type) f.room_type = filters.room_type
    if (filters.food_option !== null) f.food_option = filters.food_option
    if (filters.sharing_type) f.sharing_type = filters.sharing_type
    try {
      const res = await lodgeAPI.filterRooms(f)
      setRooms(res.data)
    } catch {}
  }

  const allocate = async (id) => {
    try { await lodgeAPI.allocate(id, 1); load() } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }
  const release = async (id) => {
    try { await lodgeAPI.release(id, 1); load() } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Lodge Manager Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="orb w-64 h-64 bg-emerald-300 top-[-40px] right-[-30px]" style={{ animationDelay: '1s' }} />
          <div className="orb w-48 h-48 bg-teal-200 bottom-8 left-8" style={{ animationDelay: '4s' }} />

          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <UploadDocxSection onSuccess={() => { setShowAddForm(false); load() }} />
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Room Management</h2>
                  <div className="flex gap-2">
                    <button onClick={load} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm py-1.5 flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add Room
                    </button>
                  </div>
                </div>

                {showAddForm && <AddRoomForm onSuccess={() => { setShowAddForm(false); load() }} />}

                <div className="flex gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                  <select className="input w-32 text-xs" value={filters.room_type} onChange={e => setFilters(f => ({ ...f, room_type: e.target.value }))}>
                    <option value="">All Types</option><option value="ac">AC</option><option value="non_ac">Non-AC</option>
                  </select>
                  <select className="input w-32 text-xs" value={filters.sharing_type || ''} onChange={e => setFilters(f => ({ ...f, sharing_type: e.target.value ? +e.target.value : null }))}>
                    <option value="">All Sharing</option>{[2, 3, 4].map(n => <option key={n} value={n}>{n} Sharing</option>)}
                  </select>
                  <select className="input w-32 text-xs" value={filters.food_option === null ? '' : String(filters.food_option)} onChange={e => setFilters(f => ({ ...f, food_option: e.target.value === '' ? null : e.target.value === 'true' }))}>
                    <option value="">All Food</option><option value="true">With Food</option><option value="false">Without Food</option>
                  </select>
                  <button onClick={filter} className="btn-secondary text-xs py-1.5">Filter</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
                  {rooms.map(r => (
                    <div key={r.id} className={r.is_available ? 'card-available p-4' : 'card-occupied p-4'}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{r.room_id}</p>
                          <p className="text-xs text-gray-500">
                            {r.room_type?.toUpperCase()} · {r.sharing_type} Sharing
                            {r.food_option ? ' · 🍽 Food' : ''}
                          </p>
                          {r.features?.length > 0 && <p className="text-xs text-gray-400">{r.features.join(', ')}</p>}
                        </div>
                        <Hotel className={`w-5 h-5 ${r.is_available ? 'text-green-500' : 'text-red-500'}`} />
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Occupancy</span><span>{r.current_occupancy}/{r.sharing_type || r.capacity}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="progress-bar bg-amber-500" style={{ width: `${(r.current_occupancy / (r.sharing_type || r.capacity)) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => allocate(r.id)} disabled={!r.is_available} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <UserPlus className="w-3 h-3" /> Allocate
                        </button>
                        <button onClick={() => release(r.id)} disabled={r.current_occupancy === 0} className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-gray-700 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <UserMinus className="w-3 h-3" /> Release
                        </button>
                      </div>
                    </div>
                ))}
              </div>
            </div>
            </div>
          )}

          {activeTab === 'empty' && emptyRooms && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Empty Rooms ({emptyRooms.total_empty_rooms})</h2>
              <div className="space-y-4">
                {Object.entries(emptyRooms.by_floor).map(([floor, floorRooms]) => (
                  <div key={floor}>
                    <h3 className="font-medium text-sm text-gray-700 mb-2">Floor {floor}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {floorRooms.map(r => (
                        <div key={r.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                          <p className="font-medium text-sm">{r.room_id}</p>
                          <p className="text-xs text-gray-600 mt-1">{r.capacity} bed(s) • {(r.features || []).join(', ') || 'No amenities'}</p>
                          <button onClick={() => allocate(r.id)} className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium mt-2 py-1.5 rounded-lg">
                            Allocate Guest
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'summary' && summary && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 page-enter stagger">
              {[
                { label: 'Total Rooms', value: summary.total_rooms },
                { label: 'Available Rooms', value: summary.available_rooms, color: 'text-green-600' },
                { label: 'Occupied Rooms', value: summary.occupied_rooms, color: 'text-red-600' },
                { label: 'AC Rooms', value: summary.ac_rooms, color: 'text-blue-600' },
                { label: 'Non-AC Rooms', value: summary.non_ac_rooms },
                { label: 'With Food', value: summary.with_food, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label} className="stat-tile">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className={`text-3xl font-bold stat-value ${s.color || 'text-gray-900'}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
