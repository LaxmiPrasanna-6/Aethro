import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import BookingForm from '../../components/booking/BookingForm'
import BookingList from '../../components/booking/BookingList'
import BookingApproval from '../../components/admin/BookingApproval'
import Analytics from '../../components/admin/Analytics'
import UserApprovals from '../../components/admin/UserApprovals'
import { hospitalAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, RefreshCw, Activity, Star, TrendingUp, UploadCloud, Download,
  User, AlertTriangle, Stethoscope, Bed,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const RESOURCE_TYPES = ['ward', 'icu', 'ot', 'consultation', 'lab', 'bed']
const COMMON_SYMPTOMS = ['Fever', 'Chest Pain', 'Headache', 'Cough', 'Shortness of Breath',
  'Nausea', 'Vomiting', 'Dizziness', 'Back Pain', 'Joint Pain', 'Rash', 'Fatigue']

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    registered: 'bg-blue-100 text-blue-700',
    admitted: 'bg-purple-100 text-purple-700',
    in_treatment: 'bg-yellow-100 text-yellow-800',
    discharged: 'bg-green-100 text-green-700',
    available: 'bg-green-100 text-green-700',
    busy: 'bg-yellow-100 text-yellow-800',
    off_duty: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  )
}

// ─── Reception: Patient Registration ─────────────────────────────────────────

function PatientRegistration({ onSuccess }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'male', contact: '', symptoms: [], emergency: false, notes: '' })
  const [customSymptom, setCustomSymptom] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleSymptom = (s) => setForm(f => ({
    ...f,
    symptoms: f.symptoms.includes(s) ? f.symptoms.filter(x => x !== s) : [...f.symptoms, s],
  }))

  const addCustom = () => {
    const s = customSymptom.trim()
    if (s && !form.symptoms.includes(s)) setForm(f => ({ ...f, symptoms: [...f.symptoms, s] }))
    setCustomSymptom('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.symptoms.length) { toast.error('Add at least one symptom'); return }
    setLoading(true)
    try {
      const res = await hospitalAPI.registerPatient({ ...form, age: +form.age })
      const assigned = res.data.assigned_doctor_name
      toast.success(
        assigned
          ? `Patient ${form.name} registered — assigned to Dr. ${assigned}`
          : `Patient ${form.name} registered`,
        { duration: 5000 }
      )
      setForm({ name: '', age: '', gender: 'male', contact: '', symptoms: [], emergency: false, notes: '' })
      onSuccess?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-4 h-4" /> Register New Patient
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Contact / Phone *</label>
            <input className="input" required value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Age *</label>
            <input type="number" min="0" max="150" className="input" required value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-red-600" checked={form.emergency} onChange={e => setForm(f => ({ ...f, emergency: e.target.checked }))} />
              <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Emergency
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="label">Symptoms * <span className="text-xs text-gray-400 font-normal">(doctor is auto-assigned from these)</span></label>
          <div className="flex flex-wrap gap-2 mb-2">
            {COMMON_SYMPTOMS.map(s => (
              <button key={s} type="button" onClick={() => toggleSymptom(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.symptoms.includes(s) ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Other symptom..." value={customSymptom}
              onChange={e => setCustomSymptom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())} />
            <button type="button" onClick={addCustom} className="btn-secondary text-xs px-3">Add</button>
          </div>
          {form.symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.symptoms.map(s => (
                <span key={s} className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  {s}
                  <button type="button" onClick={() => toggleSymptom(s)} className="hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Registering…' : 'Register Patient'}
        </button>
      </form>
    </div>
  )
}

// ─── Patient List ─────────────────────────────────────────────────────────────

function PatientList({ role }) {
  const [patients, setPatients] = useState([])
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [resources, setResources] = useState([])

  const load = () => {
    hospitalAPI.getPatients(filter !== 'all' ? filter : undefined).then(r => setPatients(r.data)).catch(() => {})
    hospitalAPI.getResources({}).then(r => setResources(r.data)).catch(() => {})
  }

  useEffect(load, [filter])

  const updateStatus = async (id, updates) => {
    setUpdating(true)
    try {
      await hospitalAPI.updatePatient(id, updates)
      toast.success('Patient updated')
      load()
      setSelected(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setUpdating(false)
  }

  const STATUSES = ['registered', 'admitted', 'in_treatment', 'discharged']
  const FILTERS = ['all', ...STATUSES]

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {patients.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No patients found.</p>}

      {patients.map(p => (
        <div key={p.id} className={`border rounded-xl p-4 ${p.emergency ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">{p.name}</p>
                {p.emergency && <span className="text-xs bg-red-600 text-white px-1.5 py-0.5 rounded flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Emergency</span>}
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {p.age}y · {p.gender} · {p.contact}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Symptoms: {p.symptoms?.join(', ') || '—'}
              </p>
              {p.assigned_doctor_name && (
                <p className="text-xs text-blue-600 mt-0.5">Doctor: {p.assigned_doctor_name}</p>
              )}
              {p.assigned_resource_name ? (
                <p className="text-xs text-green-700 font-medium mt-0.5">
                  📍 Room: {p.assigned_resource_name}
                </p>
              ) : p.emergency ? (
                <p className="text-xs text-red-500 mt-0.5">⚠ No room assigned yet</p>
              ) : null}
              {p.treatment_notes && (
                <p className="text-xs text-gray-500 mt-1 italic">{p.treatment_notes}</p>
              )}
            </div>
            <button onClick={() => setSelected(selected?.id === p.id ? null : p)}
              className="text-xs text-primary-600 hover:underline">
              {selected?.id === p.id ? 'Close' : 'Update'}
            </button>
          </div>

          {selected?.id === p.id && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Update Status</label>
                  <select className="input text-xs"
                    defaultValue={p.status}
                    onChange={e => updateStatus(p.id, { status: e.target.value })}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                {(role === 'reception' || role === 'admin') && (
                  <div>
                    <label className="label">Assign Room</label>
                    {p.emergency ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        Emergency — room is assigned by doctor/admin only
                      </div>
                    ) : (
                      <select className="input text-xs"
                        defaultValue={p.assigned_resource_id || ''}
                        onChange={e => e.target.value && updateStatus(p.id, { assigned_resource_id: e.target.value })}>
                        <option value="">— Select room —</option>
                        {resources.filter(r => r.is_available).map(r => (
                          <option key={r.id} value={r.id}>{r.room_id} ({r.resource_type?.toUpperCase()})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              {role === 'doctor' && (
                <div>
                  <label className="label">Treatment Notes</label>
                  <div className="flex gap-2">
                    <input className="input text-xs flex-1" placeholder="Diagnosis, prescription, etc."
                      id={`notes-${p.id}`} defaultValue={p.treatment_notes || ''} />
                    <button type="button" disabled={updating}
                      onClick={() => updateStatus(p.id, { treatment_notes: document.getElementById(`notes-${p.id}`)?.value })}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button disabled={updating} onClick={() => updateStatus(p.id, { emergency: !p.emergency })}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${p.emergency ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-red-300 text-red-700 hover:bg-red-50'}`}>
                  {p.emergency ? 'Clear Emergency' : 'Mark Emergency'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Availability Panel ───────────────────────────────────────────────────────

function AvailabilityPanel() {
  const [summary, setSummary] = useState({})
  const [doctors, setDoctors] = useState([])

  const load = () => {
    hospitalAPI.availabilitySummary().then(r => setSummary(r.data)).catch(() => {})
    hospitalAPI.getDoctors().then(r => setDoctors(r.data)).catch(() => {})
  }
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [])

  const TYPE_ICON = { ward: '🏥', icu: '🚨', ot: '🔬', lab: '🧪', consultation: '👨‍⚕️', bed: '🛏️' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Real-time Availability</h2>
        <button onClick={load} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 stagger">
        {Object.entries(summary).map(([type, data]) => (
          <div key={type} className="card">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{TYPE_ICON[type] || '🏠'}</span>
              <p className="font-medium text-sm capitalize">{type}</p>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Available</span><span className="text-green-600 font-semibold">{data.available}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Occupied</span><span className="text-red-500 font-semibold">{data.occupied}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full transition-all"
                style={{ width: data.total ? `${(data.available / data.total) * 100}%` : '0%' }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{data.available}/{data.total} free</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Doctors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 stagger">
          {doctors.map(d => (
            <div key={d.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{d.username}</p>
                <p className="text-xs text-gray-500 capitalize">{d.specialization}</p>
              </div>
              <StatusBadge status={d.availability_status} />
            </div>
          ))}
          {doctors.length === 0 && <p className="text-xs text-gray-400">No doctors registered yet.</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Doctor: availability toggle ──────────────────────────────────────────────

function DoctorAvailabilityToggle({ currentStatus, onUpdate }) {
  const options = ['available', 'busy', 'off_duty']
  const set = async (s) => {
    try { await hospitalAPI.setAvailability(s); onUpdate(s) } catch { toast.error('Failed') }
  }
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-600">My Status:</span>
      {options.map(o => (
        <button key={o} onClick={() => set(o)}
          className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium border transition-colors
            ${currentStatus === o ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:border-primary-400'}`}>
          {o.replace('_', ' ')}
        </button>
      ))}
    </div>
  )
}

// ─── Existing sub-components (unchanged) ─────────────────────────────────────

function UploadBlueprintSection({ onSuccess }) {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.docx')) { toast.error('Only .docx files are accepted'); return }
    setFile(f); setResult(null)
  }
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }
  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const res = await hospitalAPI.uploadDocx(file)
      setResult({ ok: true, data: res.data }); toast.success(res.data.message)
      onSuccess?.(); setFile(null)
    } catch (err) {
      const detail = err.response?.data?.detail
      const data = typeof detail === 'object' ? detail : { message: String(detail || 'Upload failed') }
      setResult({ ok: false, data }); toast.error(data.message || 'Upload failed')
    } finally { setUploading(false) }
  }
  const downloadTemplate = async () => {
    try {
      const res = await hospitalAPI.downloadTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = 'hospital_blueprint_template.docx'; a.click()
      URL.revokeObjectURL(url); toast.success('Template downloaded')
    } catch { toast.error('Could not download template') }
  }
  const zoneClass = ['relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
    dragOver ? 'border-primary-500 bg-primary-50 cursor-copy' :
    result?.ok ? 'border-green-400 bg-green-50' :
    result && !result.ok ? 'border-red-300 bg-red-50' :
    file ? 'border-blue-400 bg-blue-50' :
    'border-gray-300 hover:border-primary-400 hover:bg-gray-50 cursor-pointer'].join(' ')

  return (
    <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-red-900">Upload Hospital Blueprint (.docx)</h3>
        <button onClick={downloadTemplate} className="flex items-center gap-1 text-xs bg-white border border-red-300 hover:bg-red-50 text-red-700 font-medium px-2.5 py-1.5 rounded-lg">
          <Download className="w-3.5 h-3.5" /> Download Template
        </button>
      </div>
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop} onClick={() => !file && inputRef.current?.click()} className={zoneClass}>
        <input ref={inputRef} type="file" accept=".docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {!file ? (
          <><UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Drag your <span className="text-primary-600 font-semibold">.docx</span> blueprint or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">Format: Room ID, Type (Ward/ICU/OT/Consultation/Lab/Bed), Department, Floor, Capacity</p></>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-900">✓ {file.name}</p>
            <div className="flex gap-2 justify-center">
              <button onClick={handleUpload} disabled={uploading} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                {uploading ? 'Uploading…' : 'Upload Blueprint'}
              </button>
              <button onClick={() => { setFile(null); setResult(null) }} disabled={uploading} className="bg-gray-300 hover:bg-gray-400 text-gray-900 text-xs font-medium px-3 py-1.5 rounded-lg">Cancel</button>
            </div>
          </div>
        )}
      </div>
      {result && (
        <div className={`border rounded-lg p-3 text-sm ${result.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
          <p className={result.ok ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>{result.data.message || 'Upload failed'}</p>
          {result.ok && (<>
            {result.data.created > 0 && <p className="text-xs text-green-700 mt-1">✓ Created: {result.data.created}</p>}
            {result.data.skipped > 0 && <p className="text-xs text-orange-700">⊘ Skipped: {result.data.skipped}</p>}
          </>)}
        </div>
      )}
    </div>
  )
}

function AddResourceForm({ onSuccess }) {
  const [form, setForm] = useState({ room_id: '', resource_type: 'ward', capacity: 10, department: '', floor: 1 })
  const [loading, setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const ROLE_TABS = {
  admin:     [
    { id: 'overview',   label: 'Overview' },
    { id: 'resources',  label: 'Resources' },
    { id: 'bookings',   label: 'Bookings' },
    { id: 'analytics',  label: 'Analytics' },
    { id: 'users',      label: 'Users' },
  ],
  doctor:    [
    { id: 'patients',   label: 'My Patients' },
    { id: 'book',       label: 'Book Resource' },
    { id: 'bookings',   label: 'My Bookings' },
  ],
  reception: [
    { id: 'register',   label: 'Register Patient' },
    { id: 'patients',   label: 'Patients' },
    { id: 'availability', label: 'Availability' },
    { id: 'bookings',   label: 'Bookings' },
  ],
}

export default function HospitalDashboard() {
  const { user } = useAuth()
  const role = user?.role || 'reception'
  const tabs = ROLE_TABS[role] || ROLE_TABS.reception
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || tabs[0].id
  const setActiveTab = (tab) => setSearchParams({ tab })
  const [resources, setResources] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [doctorStatus, setDoctorStatus] = useState(user?.availability_status || 'available')

  const loadResources = () => {
    hospitalAPI.getResources({}).then(r => setResources(r.data)).catch(() => {})
  }
  useEffect(() => { loadResources() }, [])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Hospital Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="orb w-80 h-80 bg-rose-200 top-[-60px] right-[-50px]" style={{ animationDelay: '0s' }} />
          <div className="orb w-56 h-56 bg-pink-200 bottom-8 left-4" style={{ animationDelay: '5s' }} />

          {/* Role-specific status bar */}
          {role === 'doctor' && (
            <div className="mb-4 p-3 bg-white border border-gray-200 rounded-xl flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Dr. {user?.username}</span>
              <span className="text-xs text-gray-400 capitalize">{user?.specialization || 'General Medicine'}</span>
              <DoctorAvailabilityToggle currentStatus={doctorStatus} onUpdate={setDoctorStatus} />
            </div>
          )}


          {/* ── ADMIN tabs ───────────────────────────── */}
          {role === 'admin' && activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card"><h2 className="font-semibold mb-4">Pending Booking Approvals</h2><BookingApproval /></div>
              <DemandForecast />
              <ReputationReport />
            </div>
          )}

          {role === 'admin' && activeTab === 'resources' && (
            <div className="card">
              <UploadBlueprintSection onSuccess={loadResources} />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Hospital Resources</h2>
                <div className="flex gap-2">
                  <button onClick={loadResources} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm py-1.5 flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
                </div>
              </div>
              {showAddForm && <AddResourceForm onSuccess={() => { setShowAddForm(false); loadResources() }} />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger">
                {resources.map(r => (
                  <div key={r.id} className={r.is_available ? 'card-available p-3' : 'card-occupied p-3'}>
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

          {role === 'admin' && activeTab === 'bookings' && (
            <div className="card"><h2 className="font-semibold mb-4">All Bookings</h2>
              <BookingList filter="org" showActions={false} />
            </div>
          )}

          {role === 'admin' && activeTab === 'analytics' && <Analytics />}

          {role === 'admin' && activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h2 className="font-semibold mb-2">Doctor & Reception Approvals</h2>
                <p className="text-xs text-gray-500 mb-3">New staff must be approved before they can log in.</p>
                <UserApprovals filterRoles={['doctor', 'reception']} />
              </div>
              <ReputationReport />
            </div>
          )}

          {/* ── DOCTOR tabs ───────────────────────────── */}
          {role === 'doctor' && activeTab === 'patients' && (
            <div className="card">
              <h2 className="font-semibold mb-4 flex items-center gap-2"><Bed className="w-4 h-4" /> My Assigned Patients</h2>
              <PatientList role="doctor" />
            </div>
          )}

          {role === 'doctor' && activeTab === 'book' && (
            <div className="card max-w-2xl">
              <h2 className="font-semibold mb-1">Book a Resource</h2>
              <p className="text-xs text-gray-500 mb-4">Doctor bookings are auto-approved.</p>
              <BookingForm orgType="hospital" />
            </div>
          )}

          {role === 'doctor' && activeTab === 'bookings' && (
            <div className="card"><h2 className="font-semibold mb-4">My Bookings</h2>
              <BookingList filter="my" showActions={true} />
            </div>
          )}

          {/* ── RECEPTION tabs ─────────────────────────── */}
          {role === 'reception' && activeTab === 'register' && (
            <PatientRegistration onSuccess={() => setActiveTab('patients')} />
          )}

          {role === 'reception' && activeTab === 'patients' && (
            <div className="card">
              <h2 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4" /> All Patients</h2>
              <PatientList role="reception" />
            </div>
          )}

          {role === 'reception' && activeTab === 'availability' && <AvailabilityPanel />}

          {role === 'reception' && activeTab === 'bookings' && (
            <div className="card"><h2 className="font-semibold mb-4">My Bookings</h2>
              <BookingList filter="my" showActions={true} />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
