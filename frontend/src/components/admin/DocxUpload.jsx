import { useState, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  UploadCloud, FileText, AlertTriangle, SkipForward,
  ChevronDown, ChevronUp, Download, Eye, RefreshCw,
} from 'lucide-react'

// ── Axios helper with auth token ──────────────────────────────────────────
function authHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

// ── Download the real .docx template from the backend ─────────────────────
async function downloadTemplate() {
  try {
    const res = await axios.get('/api/college/rooms/docx-template', {
      headers: authHeaders(),
      responseType: 'blob',
    })
    const url = URL.createObjectURL(res.data)
    const a   = document.createElement('a')
    a.href     = url
    a.download = 'room_upload_template.docx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Could not download template')
  }
}

// ── Collapsible detail list ────────────────────────────────────────────────
function ResultSection({ icon: Icon, iconClass, title, count, items, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!items || items.length === 0) return null
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className={`w-4 h-4 ${iconClass}`} />
          {title}
          <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
            {count}
          </span>
        </span>
        {open
          ? <ChevronUp  className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && (
        <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {items.map((item, i) => (
            <li key={i} className="px-4 py-2 text-xs text-gray-700 font-mono">
              {typeof item === 'string' ? item : (
                <span>
                  <span className="font-semibold text-gray-900">{item.room_id}</span>
                  {item.reason && <span className="text-gray-500"> — {item.reason}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Raw-lines debug panel (shown when parse fails) ────────────────────────
function RawPreviewPanel({ lines }) {
  const [open, setOpen] = useState(true)
  if (!lines || lines.length === 0) return null
  return (
    <div className="border border-orange-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-orange-800">
          <Eye className="w-4 h-4" />
          What the parser actually read from your file
          <span className="text-xs bg-white border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full">
            {lines.length} lines
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-3 bg-orange-50">
          <p className="text-xs text-orange-700 mb-2">
            Compare this with your document. If lines are missing or garbled, your document
            may use tables or a non-standard format. Download the template and use that instead.
          </p>
          <pre className="text-xs bg-white border border-orange-200 rounded-lg p-3 overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
            {lines.map((l, i) => `${String(i + 1).padStart(2, ' ')}│ ${l}`).join('\n')}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────
export default function DocxUpload({ onSuccess }) {
  const [dragOver,   setDragOver]   = useState(false)
  const [file,       setFile]       = useState(null)
  const [uploading,  setUploading]  = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [result,     setResult]     = useState(null)
  const [preview,    setPreview]    = useState(null)   // debug preview data
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.docx')) {
      toast.error('Only .docx files are accepted. Download the template to get started.')
      return
    }
    setFile(f)
    setResult(null)
    setPreview(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  // ── Preview: show what was extracted WITHOUT creating rooms ──────────────
  const handlePreview = async () => {
    if (!file) return
    setPreviewing(true)
    setPreview(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post('/api/college/rooms/preview-docx', formData, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      })
      setPreview(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  // ── Upload: parse + insert rooms ─────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post('/api/college/rooms/upload-docx', formData, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      })
      setResult({ ok: true, data: res.data })
      toast.success(res.data.message)
      onSuccess?.()
    } catch (err) {
      const detail = err.response?.data?.detail
      const data   = typeof detail === 'object' ? detail : { message: String(detail || 'Upload failed') }
      setResult({ ok: false, data })
      toast.error(data.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const reset = () => { setFile(null); setResult(null); setPreview(null) }

  // ── Determine drop-zone colour ────────────────────────────────────────────
  const zoneClass = [
    'relative border-2 border-dashed rounded-xl p-8 text-center transition-colors',
    dragOver                ? 'border-primary-500 bg-primary-50 cursor-copy'   :
    result?.ok              ? 'border-green-400  bg-green-50  cursor-default'  :
    result && !result.ok    ? 'border-red-300    bg-red-50    cursor-default'  :
    file                    ? 'border-blue-400   bg-blue-50   cursor-default'  :
                              'border-gray-300   hover:border-primary-400 hover:bg-gray-50 cursor-pointer',
  ].join(' ')

  return (
    <div className="space-y-5">

      {/* ── Format guide + template button ── */}
      <div className="flex items-start justify-between bg-indigo-50 border border-indigo-200 rounded-xl p-4 gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-indigo-900">Required Document Format</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            Plain paragraphs, one field per line, blank line between rooms.
            Valid types:&nbsp;
            <code className="bg-indigo-100 px-1 rounded">Classroom</code>&nbsp;
            <code className="bg-indigo-100 px-1 rounded">Lab</code>&nbsp;
            <code className="bg-indigo-100 px-1 rounded">Seminar Hall</code>
          </p>
          <pre className="mt-2 text-xs text-indigo-800 bg-indigo-100 rounded-lg p-2 leading-relaxed">
{`Block: A
Room ID: A-101
Type: Classroom
Capacity: 30
Facilities: projector, ac, whiteboard

Block: A
Room ID: A-102
Type: Lab
Capacity: 25
Facilities: computers, ac`}
          </pre>
          <p className="text-xs text-indigo-600 mt-2 font-medium">
            ⚠ Do NOT use Word tables or headers — plain text only.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Download .docx Template
        </button>
      </div>

      {/* ── Drop zone ── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={zoneClass}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {!file ? (
          <>
            <UploadCloud className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop your <span className="text-primary-600">.docx</span> file here
            </p>
            <p className="text-xs text-gray-400 mt-1">or click to browse</p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · .docx</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Action buttons ── */}
      {file && !result && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading || previewing}
            className="btn-primary flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            {uploading ? 'Uploading & parsing…' : 'Upload & Create Rooms'}
          </button>
          <button
            onClick={handlePreview}
            disabled={uploading || previewing}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {previewing ? 'Reading file…' : 'Preview (dry run)'}
          </button>
          <button onClick={reset} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Change file
          </button>
        </div>
      )}

      {/* ── Dry-run preview panel ── */}
      {preview && !result && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">
            Preview — no rooms created yet
          </p>
          <div className="flex gap-6 text-sm">
            <span><strong className="text-blue-800">{preview.valid_rooms_parsed}</strong> <span className="text-blue-700">valid room(s) found</span></span>
            <span><strong className="text-red-700">{preview.parse_errors?.length ?? 0}</strong> <span className="text-red-600">error(s)</span></span>
          </div>

          {/* Show parsed rooms */}
          {preview.parsed_rooms?.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-blue-200">
              <table className="w-full text-xs">
                <thead className="bg-blue-100 text-blue-800">
                  <tr>
                    {['Block', 'Room ID', 'Type', 'Capacity', 'Facilities'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.parsed_rooms.map((r, i) => (
                    <tr key={i} className="border-t border-blue-100 even:bg-blue-50 odd:bg-white">
                      <td className="px-3 py-1.5">{r.block || '—'}</td>
                      <td className="px-3 py-1.5 font-mono font-semibold">{r.room_id}</td>
                      <td className="px-3 py-1.5 capitalize">{r.resource_type?.replace('_', ' ')}</td>
                      <td className="px-3 py-1.5">{r.capacity}</td>
                      <td className="px-3 py-1.5 text-gray-500">{r.facilities?.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Parse errors in preview */}
          {preview.parse_errors?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-700">Parse errors:</p>
              {preview.parse_errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600 font-mono bg-red-50 px-3 py-1 rounded">{e}</p>
              ))}
            </div>
          )}

          <RawPreviewPanel lines={preview.raw_lines_preview} />

          {preview.valid_rooms_parsed > 0 && (
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex items-center gap-2 text-sm">
              <UploadCloud className="w-4 h-4" />
              {uploading ? 'Creating rooms…' : `Confirm & Create ${preview.valid_rooms_parsed} Room(s)`}
            </button>
          )}
        </div>
      )}

      {/* ── Upload result panel ── */}
      {result && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className={`rounded-xl p-4 ${result.ok ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'}`}>
            <p className={`text-sm font-semibold ${result.ok ? 'text-green-800' : 'text-red-800'}`}>
              {result.data.message}
            </p>
            {result.ok && (
              <div className="flex gap-6 mt-3">
                {[
                  { label: 'Blocks found', value: result.data.total_blocks_found, color: 'text-gray-800' },
                  { label: 'Created',      value: result.data.created,            color: 'text-green-700 font-extrabold' },
                  { label: 'Skipped',      value: result.data.skipped,            color: 'text-yellow-700' },
                  { label: 'Errors',       value: result.data.parse_errors,       color: 'text-red-600' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error-state raw preview */}
          {!result.ok && (
            <RawPreviewPanel lines={result.data.raw_preview || []} />
          )}

          <ResultSection
            icon={SkipForward}
            iconClass="text-yellow-500"
            title="Skipped (Room ID already exists)"
            count={result.data.skipped}
            items={result.data.skipped_details}
          />
          <ResultSection
            icon={AlertTriangle}
            iconClass="text-red-500"
            title="Parse errors"
            count={result.data.parse_errors || result.data.parse_error_details?.length}
            items={result.data.parse_error_details}
            defaultOpen
          />

          {/* Raw lines when upload succeeded but some blocks failed */}
          {result.ok && result.data.parse_errors > 0 && (
            <RawPreviewPanel lines={result.data.raw_preview || []} />
          )}

          <button onClick={reset} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Upload another file
          </button>
        </div>
      )}
    </div>
  )
}
