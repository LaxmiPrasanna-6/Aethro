import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, GraduationCap, Home, Hotel, Stethoscope, LogOut } from 'lucide-react'

const ORG_ROUTES = {
  college: { admin: '/college/admin', staff: '/college/staff', student: '/college/student' },
  hostel: { warden: '/hostel' },
  lodge: { manager: '/lodge' },
  hospital: { admin: '/hospital', reception: '/hospital', doctor: '/hospital' },
}

const ORG_ICONS = {
  college: GraduationCap,
  hostel: Home,
  lodge: Hotel,
  hospital: Stethoscope,
}

const ORG_COLORS = {
  college: 'bg-blue-600',
  hostel: 'bg-green-600',
  lodge: 'bg-amber-600',
  hospital: 'bg-red-600',
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const Icon = ORG_ICONS[user.org_type] || Building2
  const route = ORG_ROUTES[user.org_type]?.[user.role] || '/login'
  const color = ORG_COLORS[user.org_type] || 'bg-gray-600'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <div className={`${color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <Icon className="text-white w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {user.username}!</h1>
        <p className="text-gray-500 text-sm mb-1 capitalize">{user.org_type} — {user.role}</p>
        <p className="text-gray-400 text-xs mb-6">{user.email}</p>

        <button
          onClick={() => navigate(route)}
          className="btn-primary w-full mb-3"
        >
          Go to {user.org_type ? user.org_type.charAt(0).toUpperCase() + user.org_type.slice(1) : 'Dashboard'} Dashboard
        </button>

        <button
          onClick={() => { logout(); navigate('/login') }}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )
}
