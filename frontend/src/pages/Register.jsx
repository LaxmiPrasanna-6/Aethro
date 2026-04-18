import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Building2, UserPlus, GraduationCap, Hotel, HeartPulse, Home } from 'lucide-react'

const ORG_ROLES = {
  college:  ['admin', 'staff', 'student'],
  hostel:   ['warden'],
  lodge:    ['manager'],
  hospital: ['admin', 'reception', 'doctor'],
}

const ORG_META = {
  college:  { icon: GraduationCap, color: 'text-violet-500', bg: 'bg-violet-50 border-violet-200' },
  hostel:   { icon: Hotel,         color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-200'  },
  lodge:    { icon: Home,          color: 'text-emerald-500',bg: 'bg-emerald-50 border-emerald-200'},
  hospital: { icon: HeartPulse,    color: 'text-rose-500',   bg: 'bg-rose-50 border-rose-200'    },
}

function InputField({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-400'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm_password: '', phone: '',
    org_type: 'college', role: 'admin', org_name: '', department: '', club: '', specialization: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({
    ...f, [k]: v,
    ...(k === 'org_type' ? { role: ORG_ROLES[v][0] } : {}),
  }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authAPI.register(form)
      const needsApproval = !['admin', 'warden', 'manager'].includes(form.role)
      toast.success(
        needsApproval
          ? 'Registered! Your account is pending admin approval before you can log in.'
          : 'Registration successful! Please log in.',
        { duration: 6000 }
      )
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const roles = ORG_ROLES[form.org_type] || []
  const meta = ORG_META[form.org_type]
  const OrgIcon = meta.icon

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)' }}>

        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

        <div className="relative flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-2xl border border-white/20">
            <Building2 className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-white text-xl font-bold tracking-tight">Smart Allocation</h1>
            <p className="text-blue-300 text-xs">Resource Management System</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <div>
            <h2 className="text-white text-3xl font-bold leading-tight tracking-tight">
              Join your<br />
              <span className="text-blue-300">organization.</span>
            </h2>
            <p className="text-blue-200 text-sm mt-3 leading-relaxed max-w-xs">
              Create an account and get access to smart booking, resource tracking, and role-based workflows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ORG_META).map(([key, { icon: Icon, color }]) => (
              <div key={key}
                className={`flex items-center gap-2 bg-white/8 border border-white/10 rounded-xl px-3 py-2.5 transition-colors ${form.org_type === key ? 'bg-white/15 border-white/25' : ''}`}>
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-white text-xs font-medium capitalize">{key}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-400/60 text-xs">© {new Date().getFullYear()} Smart Allocation · Aethronix</p>
      </div>

      {/* ── Right form panel ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 overflow-y-auto">
        <div className="w-full max-w-md py-8">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-6 justify-center">
            <div className="bg-primary-600 p-2.5 rounded-2xl">
              <Building2 className="text-white w-6 h-6" />
            </div>
            <h1 className="text-gray-900 text-lg font-bold">Smart Allocation</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
              <p className="text-sm text-gray-500 mt-1">Fill in your details to get started</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Org type selector — visual cards */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Organization Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(ORG_META).map(([key, { icon: Icon, color, bg }]) => (
                    <button key={key} type="button" onClick={() => set('org_type', key)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all ${form.org_type === key ? `${bg} ${color} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <Icon className="w-4 h-4" />
                      <span className="capitalize">{key}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Role */}
              <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border ${meta.bg}`}>
                <OrgIcon className={`w-4 h-4 ${meta.color} flex-shrink-0`} />
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
                  <select className="w-full text-sm bg-transparent focus:outline-none text-gray-800"
                    value={form.role} onChange={e => set('role', e.target.value)}>
                    {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* Name + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Username" required>
                  <input className={inputCls} placeholder="johndoe" required value={form.username} onChange={e => set('username', e.target.value)} />
                </InputField>
                <InputField label="Phone" required>
                  <input className={inputCls} placeholder="+91 98765 43210" required value={form.phone} onChange={e => set('phone', e.target.value)} />
                </InputField>
              </div>

              {/* Email */}
              <InputField label="Email" required>
                <input type="email" className={inputCls} placeholder="you@example.com" required value={form.email} onChange={e => set('email', e.target.value)} />
              </InputField>

              {/* Passwords */}
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Password" required>
                  <input type="password" className={inputCls} placeholder="••••••••" required value={form.password} onChange={e => set('password', e.target.value)} />
                </InputField>
                <InputField label="Confirm Password" required>
                  <input type="password" className={inputCls} placeholder="••••••••" required value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
                </InputField>
              </div>

              {/* Org name */}
              <InputField label="Organization Name">
                <input className={inputCls} placeholder="e.g. City General Hospital" value={form.org_name} onChange={e => set('org_name', e.target.value)} />
              </InputField>

              {/* College-specific */}
              {form.org_type === 'college' && (
                <div className="grid grid-cols-2 gap-3">
                  <InputField label={`Department${form.role === 'staff' ? ' *' : ''}`}>
                    <input className={inputCls} placeholder="e.g. Computer Science" value={form.department} onChange={e => set('department', e.target.value)} />
                  </InputField>
                  {form.role === 'student' && (
                    <InputField label="Club Name">
                      <input className={inputCls} placeholder="e.g. Robotics Club" value={form.club} onChange={e => set('club', e.target.value)} />
                    </InputField>
                  )}
                </div>
              )}

              {/* Hospital doctor specialization */}
              {form.org_type === 'hospital' && form.role === 'doctor' && (
                <InputField label="Specialization">
                  <input className={inputCls} placeholder="e.g. Cardiology, Neurology, General Medicine" value={form.specialization} onChange={e => set('specialization', e.target.value)} />
                </InputField>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-1">
                <UserPlus className="w-4 h-4" />
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
