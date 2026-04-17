import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, CalendarPlus, ClipboardList, Users,
  Building2, BarChart3, BookOpen, BedDouble, LogOut,
  Stethoscope, FlaskConical, CheckSquare
} from 'lucide-react'

const NAV_MAP = {
  college_admin: [
    { icon: LayoutDashboard, label: 'Overview', href: '/college/admin' },
    { icon: Building2, label: 'Room Manager', href: '/college/admin?tab=rooms' },
    { icon: ClipboardList, label: 'Approvals', href: '/college/admin?tab=approvals' },
    { icon: BarChart3, label: 'Analytics', href: '/college/admin?tab=analytics' },
    { icon: Users, label: 'Users', href: '/college/admin?tab=users' },
    { icon: BookOpen, label: 'Exam Seating', href: '/exam' },
  ],
  college_staff: [
    { icon: LayoutDashboard, label: 'Overview', href: '/college/staff' },
    { icon: CalendarPlus, label: 'Book Room', href: '/college/staff?tab=book' },
    { icon: ClipboardList, label: 'My Bookings', href: '/college/staff?tab=bookings' },
  ],
  college_student: [
    { icon: LayoutDashboard, label: 'Overview', href: '/college/student' },
    { icon: CalendarPlus, label: 'Request Room', href: '/college/student?tab=book' },
    { icon: ClipboardList, label: 'My Requests', href: '/college/student?tab=bookings' },
  ],
  hostel_warden: [
    { icon: BedDouble, label: 'Room Occupancy', href: '/hostel' },
    { icon: ClipboardList, label: 'Bookings', href: '/hostel?tab=bookings' },
    { icon: BarChart3, label: 'Summary', href: '/hostel?tab=summary' },
  ],
  lodge_manager: [
    { icon: Building2, label: 'Room Manager', href: '/lodge' },
    { icon: ClipboardList, label: 'Allocations', href: '/lodge?tab=bookings' },
    { icon: BarChart3, label: 'Summary', href: '/lodge?tab=summary' },
  ],
  hospital_admin: [
    { icon: LayoutDashboard, label: 'Overview', href: '/hospital' },
    { icon: Stethoscope, label: 'Resources', href: '/hospital?tab=resources' },
    { icon: ClipboardList, label: 'Bookings', href: '/hospital?tab=bookings' },
    { icon: BarChart3, label: 'Analytics', href: '/hospital?tab=analytics' },
    { icon: Users, label: 'Staff', href: '/hospital?tab=users' },
  ],
  hospital_doctor: [
    { icon: CalendarPlus, label: 'Book Resource', href: '/hospital?tab=book' },
    { icon: ClipboardList, label: 'My Bookings', href: '/hospital?tab=mybookings' },
  ],
  hospital_reception: [
    { icon: CalendarPlus, label: 'Book Resource', href: '/hospital?tab=book' },
    { icon: ClipboardList, label: 'All Bookings', href: '/hospital?tab=bookings' },
  ],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null
  const key = `${user.org_type}_${user.role}`
  const items = NAV_MAP[key] || []

  return (
    <aside className="w-60 bg-gray-900 min-h-screen flex flex-col">
      <div className="p-5 border-b border-gray-700">
        <p className="text-white font-bold text-sm">Smart Allocation</p>
        <p className="text-gray-400 text-xs mt-1 capitalize">{user.org_type} · {user.role}</p>
        <p className="text-gray-500 text-xs truncate">{user.username}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-primary-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </aside>
  )
}
