import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import BookingForm from '../../components/booking/BookingForm'
import BookingList from '../../components/booking/BookingList'
import BookingApproval from '../../components/admin/BookingApproval'
import Analytics from '../../components/admin/Analytics'
import UserApprovals from '../../components/admin/UserApprovals'
import { hospitalAPI, authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { Plus, RefreshCw, Activity, Star, TrendingUp, UploadCloud, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const RESOURCE_TYPES = ['ward', 'icu', 'ot', 'consultation']

function UploadBlueprintSection({ onSuccess }) {
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
    setFile(f); setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const res = await hospitalAPI.uploadDocx(file)
      setResult({ ok: true, data: res.data })
      toast.success(res.data.message)
      onSuccess?.(); setFile(null)
    } catch (err) {
      const detail = err.response?.data?.detail
      const data = typeof detail === 'object' ? detail : { message: String(detail || 'Upload failed') }
      setResult({ ok: false, data })
      toast.error(data.message || 'Upload failed')
    } finally { setUploading(false) }
  }

  const downloadTemplate = async () => {
    try {
      const res = await hospitalAPI.downloadTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'hospital_blueprint_template.docx'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded')
    } catch { toast.error('Could not download template') }
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
    <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-red-900">Upload Hospital Blueprint (.docx)</h3>
        <button onClick={downloadTemplate}
          className="flex items-center gap-1 text-xs bg-white border border-red-300 hover:bg-red-50 text-red-700 font-medium px-2.5 py-1.5 rounded-lg">
          <Download className="w-3.5 h-3.5" /> Download Template
        </button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={zoneClass}>
        <input ref={inputRef} type="file" accept=".docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {!file ? (
          <>
            <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Drag your <span className="text-primary-600 font-semibold">.docx</span> blueprint or click to browse
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Format: Room ID, Type (Ward/ICU/OT/Consultation/Bed), Department, Floor, Capacity, Facilities
            </p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-900">✓ {file.name}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={handleUpload} disabled={uploading}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                {uploading ? 'Uploading…' : 'Upload Blueprint'}
              </button>
              <button onClick={() => { setFile(null); setResult(null) }} disabled={uploading}
                className="bg-gray-300 hover:bg-gray-400 text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className={`border rounded-lg p-3 text-sm ${result.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <p className={result.ok ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
            {result.data.message || 'Upload failed'}
          </p>
          {result.ok && (
            <>
              {result.data.created > 0 && <p className="text-xs text-green-700 mt-1">✓ Created: {result.data.created} resources</p>}
              {result.data.skipped > 0 && <p className="text-xs text-orange-700">⊘ Skipped: {result.data.skipped} (duplicates)</p>}
              {result.data.parse_errors > 0 && <p className="text-xs text-red-700">✗ Parse errors: {result.data.parse_errors}</p>}
            </>
          )}
          {!result.ok && Array.isArray(result.data.parse_errors) && (
            <div className="mt-2 bg-red-100 border-l-2 border-red-600 p-2 rounded text-xs text-red-800">
              {result.data.parse_errors.slice(0, 3).map((err, i) => <p key={i}>• {err}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddResourceForm({ onSuccess }) {
  const [form, setForm] = useState({ room_id: '', resource_type: 'ward', capacity: 10, department: '', floor: 1 })
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await hospitalAPI.addResource(form); toast.success('Resource added'); onSuccess() }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3 mb-4">
      <h3 className="font-semibold text-sm text-red-900">Add Resource</h3>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Resource ID</label><input className="input" required value={form.room_id} onChange={e => setForm(f => ({ ...f, room_id: e.target.value }))} /></div>
        <div><label className="label">Type</label>
          <select className="input" value={form.resource_type} onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </div>
        <div><label className="label">Department</label><input className="input" placeholder="e.g. Cardiology" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Capacity</label><input type="number" min="1" className="input" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} /></div>
        <div><label className="label">Floor</label><input type="number" min="0" className="input" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: +e.target.value }))} /></div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5">{loading ? 'Adding...' : 'Add Resource'}</button>
    </form>
  )
}

function DemandForecast() {
  const [data, setData] = useState([])
  const [type, setType] = useState('ward')
  useEffect(() => {
    hospitalAPI.demandForecast(type).then(r => {
      setData(Object.entries(r.data.demand_by_day).map(([day, count]) => ({ day, count })))
    }).catch(() => {})
  }, [type])
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Demand Forecast</h3>
        <select className="input w-36 text-xs" value={type} onChange={e => setType(e.target.value)}>
          {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ReputationReport() {
  const [staff, setStaff] = useState([])
  useEffect(() => { hospitalAPI.reputationReport().then(r => setStaff(r.data)).catch(() => {}) }, [])
  return (
    <div className="card">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Staff Reputation</h3>
      <div className="space-y-2">
        {staff.map(u => (
          <div key={u.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
            <div><p className="font-medium">{u.username}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="w-3 h-3" /><span className="font-semibold">{u.reputation_score?.toFixed(1)}</span>
              </div>
              <p className="text-xs text-red-500">{u.no_show_count} no-shows</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const TABS = ['overview', 'resources', 'book', 'bookings', 'analytics', 'users']

export default function HospitalDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'overview' : 'book')
  const [resources, setResources] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)

  const loadResources = () => {
    hospitalAPI.getResources({}).then(r => setResources(r.data)).catch(() => {})
  }
  useEffect(() => { loadResources() }, [])

  const visibleTabs = user?.role === 'admin'
    ? ['overview', 'resources', 'bookings', 'analytics', 'users']
    : ['book', 'bookings']

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Hospital Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
            {visibleTabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card"><h2 className="font-semibold mb-4">Pending Approvals</h2><BookingApproval /></div>
              <DemandForecast />
              <ReputationReport />
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="card">
              {user?.role === 'admin' && (
                <UploadBlueprintSection onSuccess={loadResources} />
              )}
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Hospital Resources</h2>
                <div className="flex gap-2">
                  <button onClick={loadResources} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm py-1.5 flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
                </div>
              </div>
              {showAddForm && <AddResourceForm onSuccess={() => { setShowAddForm(false); loadResources() }} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.map(r => (
                  <div key={r.id} className={`border rounded-xl p-3 ${r.is_available ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{r.room_id}</p>
                        <p className="text-xs text-gray-500">{r.resource_type?.toUpperCase()} · {r.department || 'General'} · Floor {r.floor}</p>
                        <p className="text-xs text-gray-400">Cap: {r.capacity} · Occ: {r.current_occupancy}</p>
                      </div>
                      <Activity className={`w-5 h-5 ${r.is_available ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'book' && (
            <div className="card max-w-2xl">
              <h2 className="font-semibold mb-1">Book a Resource</h2>
              <p className="text-xs text-gray-500 mb-4 capitalize">{user?.role === 'doctor' ? 'Doctor bookings are auto-approved.' : 'Reception bookings require admin approval.'}</p>
              <BookingForm orgType="hospital" />
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="card"><h2 className="font-semibold mb-4">Bookings</h2>
              <BookingList filter={user?.role === 'admin' ? 'org' : 'my'} showActions={user?.role !== 'admin'} />
            </div>
          )}

          {activeTab === 'analytics' && <Analytics />}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-semibold mb-4">Doctor & Reception Approvals</h2>
                <p className="text-xs text-gray-500 mb-3">
                  New doctors and reception staff must be approved here before they can log in and book resources.
                </p>
                <UserApprovals filterRoles={['doctor', 'reception']} />
              </div>
              <ReputationReport />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
