import { useState, useEffect } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import { examAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Plus, Play, RefreshCw, Users, BookOpen, Download } from 'lucide-react'

function CreateSessionForm({ onSuccess }) {
  const [form, setForm] = useState({
    exam_name: '',
    date: new Date().toISOString().split('T')[0],
    time_slot: { start: '09:00', end: '12:00' },
    subjects: '',
    departments: '',
  })
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await examAPI.createSession({
        ...form,
        subjects: form.subjects.split(',').map(s => s.trim()).filter(Boolean),
        departments: form.departments.split(',').map(s => s.trim()).filter(Boolean),
      })
      toast.success('Exam session created')
      onSuccess()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setLoading(false)
  }

  return (
    <form onSubmit={submit} className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3 mb-4">
      <h3 className="font-semibold text-sm text-indigo-900">Create Exam Session</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Exam Name</label><input className="input" required placeholder="End Semester Exam 2025" value={form.exam_name} onChange={e => setForm(f => ({ ...f, exam_name: e.target.value }))} /></div>
        <div><label className="label">Date</label><input type="date" className="input" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
        <div><label className="label">Start Time</label><input type="time" className="input" value={form.time_slot.start} onChange={e => setForm(f => ({ ...f, time_slot: { ...f.time_slot, start: e.target.value } }))} /></div>
        <div><label className="label">End Time</label><input type="time" className="input" value={form.time_slot.end} onChange={e => setForm(f => ({ ...f, time_slot: { ...f.time_slot, end: e.target.value } }))} /></div>
      </div>
      <div><label className="label">Subjects (comma-separated)</label><input className="input" placeholder="Mathematics, Physics, Chemistry" required value={form.subjects} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} /></div>
      <div><label className="label">Departments (comma-separated)</label><input className="input" placeholder="CSE, ECE, ME, CE" required value={form.departments} onChange={e => setForm(f => ({ ...f, departments: e.target.value }))} /></div>
      <button type="submit" disabled={loading} className="btn-primary text-sm py-1.5">{loading ? 'Creating...' : 'Create Session'}</button>
    </form>
  )
}

function StudentUploadSection({ onSuccess }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
    setResult(null)
  }

  const downloadTemplate = async () => {
    try {
      const res = await examAPI.downloadStudentTemplate()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'student_upload_template.docx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download template')
    }
  }

  const previewDoc = async () => {
    if (!file) return
    setPreviewing(true)
    setPreview(null)
    setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await examAPI.previewStudentDocx(formData)
      setPreview(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  const uploadDoc = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await examAPI.uploadStudentDocx(formData)
      setResult({ ok: true, data: res.data })
      toast.success(res.data.message)
      onSuccess()
    } catch (err) {
      const detail = err.response?.data?.detail
      const data = typeof detail === 'object' ? detail : { message: String(detail || 'Upload failed') }
      setResult({ ok: false, data })
      toast.error(data.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 mb-4">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-indigo-900">Upload student roll list</p>
          <p className="text-xs text-indigo-700 mt-1">
            Use a plain .docx file with one student per block. Required fields: Student ID, Name, Roll No, Department, Semester, Subjects.
          </p>
          <pre className="mt-3 text-xs text-indigo-900 bg-white rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
{`Student ID: S001
Name: Alice Sharma
Roll No: 2025CS001
Department: CSE
Semester: 5
Subjects: Mathematics, Physics
Email: alice@example.com`}
          </pre>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
          <Download className="w-3 h-3" /> Download Template
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
        <label className="block w-full">
          <span className="sr-only">Select .docx file</span>
          <input type="file" accept=".docx" onChange={handleFileChange} className="w-full file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:rounded-lg" />
        </label>
        <button onClick={previewDoc} disabled={!file || previewing} className="btn-primary text-sm py-1.5">{previewing ? 'Previewing...' : 'Preview'}</button>
      </div>

      {preview && (
        <div className="mt-4">
          <p className="text-xs text-gray-600">Parsed {preview.valid_students_parsed} student(s) from {preview.total_blocks_found} blocks.</p>
          {preview.parse_errors?.length > 0 && (
            <div className="mt-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="font-semibold">Parse errors:</p>
              <ul className="list-disc pl-5">
                {preview.parse_errors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </div>
          )}
          {preview.parsed_students?.length > 0 && (
            <div className="mt-3 text-xs text-gray-700">
              <div className="font-medium mb-1">Sample parsed student</div>
              <pre className="bg-white rounded-lg p-3 overflow-auto">{JSON.stringify(preview.parsed_students[0], null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={uploadDoc} disabled={!file || uploading} className="btn-secondary text-sm py-1.5">{uploading ? 'Uploading...' : 'Upload Students'}</button>
      </div>

      {result && result.ok === false && result.data && (
        <div className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="font-semibold">Upload failed:</p>
          <pre>{JSON.stringify(result.data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function SeatingChart({ session }) {
  if (!session.rooms || session.rooms.length === 0) return (
    <div className="text-center py-6 text-gray-400 text-sm">No seating allocated yet.</div>
  )

  const exportCSV = () => {
    const rows = ['Room,Seat,Roll No,Name,Department,Subject']
    session.rooms.forEach(room => {
      room.allocations?.forEach(a => {
        rows.push(`${room.room_name},${a.seat_number},${a.roll_number},${a.student_name},${a.department},${a.subject}`)
      })
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${session.exam_name}_seating.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{session.rooms.length} room(s) allocated</p>
        <button onClick={exportCSV} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>
      {session.rooms.map(room => (
        <div key={room.room_id} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
            <span className="font-semibold text-sm">{room.room_name}</span>
            <span className="text-xs text-gray-500">{room.allocations?.length || 0} / {room.capacity} seats used</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Seat', 'Roll No', 'Student Name', 'Department', 'Subject'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {room.allocations?.map(a => (
                  <tr key={a.seat_number} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono font-semibold text-primary-700">{a.seat_number}</td>
                    <td className="px-3 py-2 font-mono">{a.roll_number}</td>
                    <td className="px-3 py-2 font-medium">{a.student_name}</td>
                    <td className="px-3 py-2">
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">{a.department}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{a.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ExamSeating() {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [activeTab, setActiveTab] = useState('sessions')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [allocating, setAllocating] = useState(null)

  const loadSessions = async () => {
    examAPI.listSessions().then(r => setSessions(r.data)).catch(() => {})
  }

  const loadSession = async (id) => {
    const res = await examAPI.getSession(id)
    setSelectedSession(res.data)
  }

  useEffect(() => { loadSessions() }, [])

  const allocate = async (sessionId) => {
    setAllocating(sessionId)
    try {
      await examAPI.allocate(sessionId, { session_id: sessionId, room_ids: [] })
      toast.success('Seating allocated successfully!')
      await loadSession(sessionId)
      loadSessions()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Allocation failed')
    }
    setAllocating(null)
  }

  const resetSeating = async (sessionId) => {
    if (!confirm('Reset all seating for this session?')) return
    try {
      await examAPI.resetSeating(sessionId)
      toast.success('Seating reset')
      loadSessions()
      if (selectedSession?.id === sessionId) setSelectedSession(prev => ({ ...prev, rooms: [], status: 'pending' }))
    } catch {}
  }

  const TABS = [{ id: 'sessions', label: 'Sessions' }, { id: 'seating', label: 'View Seating' }]

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Examination Seating Allocation" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'sessions' && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4" /> Exam Sessions</h2>
                <div className="flex gap-2">
                  <button onClick={loadSessions} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
                  <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary text-sm py-1.5 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Create Session
                  </button>
                </div>
              </div>

              {showCreateForm && <CreateSessionForm onSuccess={() => { setShowCreateForm(false); loadSessions() }} />}
              <StudentUploadSection onSuccess={loadSessions} />

              <div className="space-y-3">
                {sessions.map(s => (
                  <div key={s.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{s.exam_name}</p>
                      <p className="text-xs text-gray-500">{s.date} · {s.time_slot?.start}–{s.time_slot?.end}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {s.subjects?.map(sub => <span key={sub} className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{sub}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'allocated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {s.status}
                      </span>
                      {s.status === 'pending' ? (
                        <button onClick={() => allocate(s.id)} disabled={allocating === s.id}
                          className="btn-primary text-xs py-1.5 flex items-center gap-1">
                          <Play className="w-3 h-3" /> {allocating === s.id ? 'Allocating...' : 'Allocate Seats'}
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => { setActiveTab('seating'); loadSession(s.id) }} className="btn-secondary text-xs py-1.5">
                            View
                          </button>
                          <button onClick={() => resetSeating(s.id)} className="btn-danger text-xs py-1.5">
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && <div className="text-center py-8 text-gray-400">No exam sessions created yet.</div>}
              </div>
            </div>
          )}

          {activeTab === 'seating' && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Seating Chart</h2>
                {selectedSession && (
                  <div>
                    <p className="text-sm font-medium">{selectedSession.exam_name}</p>
                    <p className="text-xs text-gray-500">{selectedSession.date} · Status: {selectedSession.status}</p>
                  </div>
                )}
              </div>

              {!selectedSession ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Select a session from the Sessions tab to view seating.
                </div>
              ) : (
                <SeatingChart session={selectedSession} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
