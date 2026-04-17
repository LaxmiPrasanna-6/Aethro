import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Building2, LogIn } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.username}!`)
      // Route by org_type + role
      const routeMap = {
        college: { admin: '/college/admin', staff: '/college/staff', student: '/college/student' },
        hostel: { warden: '/hostel' },
        lodge: { manager: '/lodge' },
        hospital: { admin: '/hospital', reception: '/hospital', doctor: '/hospital' },
      }
      const route = routeMap[user.org_type]?.[user.role] || '/dashboard'
      navigate(route)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary-600 p-2 rounded-xl">
            <Building2 className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Smart Allocation</h1>
            <p className="text-xs text-gray-500">Resource Management System</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the system</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email" className="input" placeholder="you@example.com" required
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password" className="input" placeholder="••••••••" required
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-600 hover:underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  )
}
