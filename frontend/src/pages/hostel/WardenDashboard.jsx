import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import { hostelAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, BedDouble, RefreshCw, Minus, UploadCloud, Download } from 'lucide-react'

const SHARING_TYPES = [1, 2, 3, 4]
const ROOM_TYPES = ['ac', 'non_ac']
const FEATURE_OPTIONS = ['WiFi', 'AC', 'TV', 'Kitchen', 'Attached Bath', 'Shared Bath', 'Balcony', 'Parking']

function AddRoomForm({ onSuccess }) {
  const [form, setForm] = useState({ 
    room_id: '', 
    floor: 1, 
    capacity: 2,
    room_type: 'ac', 
    sharing_type: 2, 
    features: [] 
  })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await hostelAPI.addRoom({
        room_id: form.room_id,
        floor: form.floor,
        capacity: form.capacity,
        room_type: form.room_type,
        sharing_type: form.sharing_type,
        features: form.features,
        resource_type: 'room'
      })
      toast.success('Room added')
      onSuccess()
      setForm({ room_id: '', floor: 1, capacity: 2, room_type: 'ac', sharing_type: 2, features: [] })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
    setLoading(false)
  }

  const toggleFeature = (feature) => {
    setForm(f => ({
      ...f,
      features: f.features.includes(feature) 
        ? f.features.filter(x => x !== feature)
        : [...f.features, feature]
    }))
  }

  return (
    <form onSubmit={submit} className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3 mb-4">
      <h3 className="font-semibold text-sm text-green-900">Add New Hostel Room</h3>
      
      {/* Row 1: Room ID, Floor, Beds */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Room ID *</label>
          <input className="input" placeholder="H-101" required value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} />
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Room Type</label>
          <select className="input" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
            {ROOM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Sharing Type</label>
          <select className="input" value={form.sharing_type} onChange={e => setForm(f => ({ ...f, sharing_type: +e.target.value }))}>
            {SHARING_TYPES.map(t => <option key={t} value={t}>{t} Sharing</option>)}
          </select>
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

      <div className="flex gap-2">
        <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5">
          {loading ? 'Adding...' : 'Add Room'}
        </button>
      </div>
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
      const res = await hostelAPI.uploadDocx(file)
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
      const res = await hostelAPI.downloadTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hostel_room_upload_template.docx'
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
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-blue-900">Bulk Upload Rooms from Word Document</h3>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1 text-xs bg-white border border-blue-300 hover:bg-blue-50 text-blue-700 font-medium px-2.5 py-1.5 rounded-lg"
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
            <p className="text-sm font-medium text-blue-900">✓ {file.name}</p>
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

export default function WardenDashboard() {
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'rooms'
  const [rooms, setRooms] = useState([])
  const [emptyRooms, setEmptyRooms] = useState(null)
  const [summary, setSummary] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [emptyFilters, setEmptyFilters] = useState({ room_type: 'all', sharing_type: 'all' })

  const load = async () => {
    hostelAPI.getRooms().then(r => setRooms(r.data)).catch(() => {})
    hostelAPI.summary().then(r => setSummary(r.data)).catch(() => {})
    hostelAPI.emptyRooms().then(r => setEmptyRooms(r.data)).catch(() => {})
  }

  useEffect(() => { load() }, [])

  const occupy = async (id) => {
    try { await hostelAPI.occupyBed(id, 1); load() } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }
  const vacate = async (id) => {
    try { await hostelAPI.vacateBed(id, 1); load() } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Hostel Warden Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="orb w-72 h-72 bg-amber-300 top-[-60px] right-[-40px]" style={{ animationDelay: '0s' }} />
          <div className="orb w-56 h-56 bg-orange-200 bottom-10 left-10" style={{ animationDelay: '3s' }} />

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
                  {rooms.map(r => (
                    <div key={r.id} className={r.is_available ? 'card-available p-4' : 'card-occupied p-4'}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-sm">{r.room_id}</p>
                          <p className="text-xs text-gray-500">Floor {r.floor} · {r.room_type?.toUpperCase() || 'Standard'} · {r.capacity} Bed(s)</p>
                        </div>
                        <BedDouble className={`w-5 h-5 ${r.is_available ? 'text-green-500' : 'text-orange-500'}`} />
                      </div>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Occupancy</span>
                          <span>{r.current_occupancy}/{r.capacity}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="progress-bar bg-primary-600" style={{ width: `${(r.current_occupancy / r.capacity) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => occupy(r.id)} disabled={!r.is_available}
                          className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <Plus className="w-3 h-3" /> Admit
                        </button>
                        <button onClick={() => vacate(r.id)} disabled={r.current_occupancy === 0}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-40 text-gray-700 text-xs py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <Minus className="w-3 h-3" /> Vacate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'empty' && emptyRooms && (() => {
            const inferRoomType = (r) => {
              if (r.room_type) return r.room_type
              const feats = (r.features || []).map(f => f.toLowerCase().replace(/[-\s]/g, ''))
              if (feats.includes('nonac')) return 'non_ac'
              if (feats.includes('ac')) return 'ac'
              return null
            }
            const inferSharing = (r) => r.sharing_type ?? r.capacity
            const matches = (r) =>
              (emptyFilters.room_type === 'all' || inferRoomType(r) === emptyFilters.room_type) &&
              (emptyFilters.sharing_type === 'all' || inferSharing(r) === +emptyFilters.sharing_type)
            const filteredByFloor = Object.entries(emptyRooms.by_floor)
              .map(([floor, rs]) => [floor, rs.filter(matches)])
              .filter(([, rs]) => rs.length > 0)
            const filteredCount = filteredByFloor.reduce((sum, [, rs]) => sum + rs.length, 0)
            const filtersActive = emptyFilters.room_type !== 'all' || emptyFilters.sharing_type !== 'all'
            return (
              <div className="card">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="font-semibold text-gray-900">
                    Empty Rooms ({filtersActive ? `${filteredCount} of ${emptyRooms.total_empty_rooms}` : emptyRooms.total_empty_rooms})
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      className="input py-1.5 text-xs w-auto"
                      value={emptyFilters.room_type}
                      onChange={e => setEmptyFilters(f => ({ ...f, room_type: e.target.value }))}
                    >
                      <option value="all">All Room Types</option>
                      {ROOM_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                    <select
                      className="input py-1.5 text-xs w-auto"
                      value={emptyFilters.sharing_type}
                      onChange={e => setEmptyFilters(f => ({ ...f, sharing_type: e.target.value }))}
                    >
                      <option value="all">All Sharing</option>
                      {SHARING_TYPES.map(t => <option key={t} value={t}>{t} Sharing</option>)}
                    </select>
                    {filtersActive && (
                      <button
                        onClick={() => setEmptyFilters({ room_type: 'all', sharing_type: 'all' })}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {filteredCount === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No empty rooms match the selected filters.</p>
                ) : (
                  <div className="space-y-4">
                    {filteredByFloor.map(([floor, floorRooms]) => (
                      <div key={floor}>
                        <h3 className="font-medium text-sm text-gray-700 mb-2">Floor {floor}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {floorRooms.map(r => (
                            <div key={r.id} className="border border-green-200 bg-green-50 rounded-lg p-3">
                              <p className="font-medium text-sm">{r.room_id}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {r.capacity} bed(s)
                                {r.room_type ? ` • ${r.room_type.replace('_', ' ').toUpperCase()}` : ''}
                                {r.sharing_type ? ` • ${r.sharing_type} Sharing` : ''}
                              </p>
                              <p className="text-xs text-gray-600">{(r.features || []).join(', ') || 'No amenities'}</p>
                              <button onClick={() => occupy(r.id)} className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium mt-2 py-1.5 rounded-lg">
                                Admit Guest
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}

          {activeTab === 'summary' && summary && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 page-enter stagger">
              {[
                { label: 'Total Rooms', value: summary.total_rooms },
                { label: 'Total Beds', value: summary.total_beds },
                { label: 'Occupied Beds', value: summary.occupied_beds, color: 'text-orange-600' },
                { label: 'Vacant Beds', value: summary.vacant_beds, color: 'text-green-600' },
                { label: 'Occupancy Rate', value: `${summary.occupancy_rate}%`, color: 'text-primary-600' },
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
