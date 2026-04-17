import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Building2, UserPlus } from 'lucide-react'

const ORG_ROLES = {
  college: ['admin', 'staff', 'student'],
  hostel: ['warden'],
  lodge: ['manager'],
  hospital: ['admin', 'reception', 'doctor'],
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm_password: '', phone: '',
    org_type: 'college', role: 'admin', org_name: '', department: '', club: '',
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
      toast.success('Registration successful! Please log in.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const roles = ORG_ROLES[form.org_type] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary-600 p-2 rounded-xl">
            <Building2 className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Smart Allocation</h1>
            <p className="text-xs text-gray-500">Create your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="johndoe" required value={form.username} onChange={e => set('username', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 9876543210" required value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" placeholder="you@example.com" required value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="••••••••" required value={form.password} onChange={e => set('password', e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input" placeholder="••••••••" required value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Organization Type</label>
              <select className="input" value={form.org_type} onChange={e => set('org_type', e.target.value)}>
                <option value="college">College</option>
                <option value="hostel">Hostel</option>
                <option value="lodge">Lodge</option>
                <option value="hospital">Hospital</option>
              </select>
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                {roles.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Organization Name</label>
            <input className="input" placeholder="e.g. ABC College of Engineering" value={form.org_name} onChange={e => set('org_name', e.target.value)} />
          </div>

          {form.org_type === 'college' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Department {form.role === 'staff' ? '(required)' : '(optional)'}</label>
                <input className="input" placeholder="e.g. Computer Science" value={form.department} onChange={e => set('department', e.target.value)} />
              </div>
              {form.role === 'student' && (
                <div>
                  <label className="label">Club Name</label>
                  <input className="input" placeholder="e.g. Robotics Club" value={form.club} onChange={e => set('club', e.target.value)} />
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 mt-2" disabled={loading}>
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
