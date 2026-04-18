import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, CalendarPlus, ClipboardList, Users,
  Building2, BarChart3, BookOpen, BedDouble, LogOut,
  Stethoscope, CheckSquare, BrainCircuit,
  Home, Hotel, GraduationCap, HeartPulse, User,
  Wifi, UserCheck, Activity,
} from 'lucide-react'

// ── Per-org accent colours ────────────────────────────────────────────────────
const ORG_THEME = {
  college:  { accent: 'bg-violet-600', hover: 'hover:bg-violet-950/60', dot: 'bg-violet-400', ring: 'ring-violet-500/40', OrgIcon: GraduationCap, label: 'College' },
  hostel:   { accent: 'bg-amber-600',  hover: 'hover:bg-amber-950/60',  dot: 'bg-amber-400',  ring: 'ring-amber-500/40',  OrgIcon: Hotel,        label: 'Hostel' },
  lodge:    { accent: 'bg-emerald-600',hover: 'hover:bg-emerald-950/60',dot: 'bg-emerald-400',ring: 'ring-emerald-500/40',OrgIcon: Home,         label: 'Lodge' },
  hospital: { accent: 'bg-rose-600',   hover: 'hover:bg-rose-950/60',   dot: 'bg-rose-400',   ring: 'ring-rose-500/40',   OrgIcon: HeartPulse,   label: 'Hospital' },
}

// ── Nav items per role ────────────────────────────────────────────────────────
const NAV_MAP = {
  college_admin: [
    { icon: LayoutDashboard, label: 'Overview',     href: '/college/admin', tab: null },
    { icon: Building2,       label: 'Room Manager', href: '/college/admin', tab: 'rooms' },
    { icon: CheckSquare,     label: 'Approvals',    href: '/college/admin', tab: 'approvals' },
    { icon: BarChart3,       label: 'Analytics',    href: '/college/admin', tab: 'analytics' },
    { icon: Users,           label: 'Users',        href: '/college/admin', tab: 'users' },
    { icon: BookOpen,        label: 'Exam Seating', href: '/exam',          tab: null },
  ],
  college_staff: [
    { icon: CalendarPlus,    label: 'Book Room',    href: '/college/staff', tab: 'book' },
    { icon: BrainCircuit,    label: 'Smart Book',   href: '/college/staff', tab: 'nlp' },
    { icon: ClipboardList,   label: 'My Bookings',  href: '/college/staff', tab: 'bookings' },
  ],
  college_student: [
    { icon: CalendarPlus,    label: 'Request Room', href: '/college/student', tab: 'book' },
    { icon: BrainCircuit,    label: 'Smart Request',href: '/college/student', tab: 'nlp' },
    { icon: ClipboardList,   label: 'My Requests',  href: '/college/student', tab: 'bookings' },
  ],
  hostel_warden: [
    { icon: BedDouble,       label: 'Rooms',        href: '/hostel', tab: 'rooms' },
    { icon: Wifi,            label: 'Empty Rooms',  href: '/hostel', tab: 'empty' },
    { icon: BarChart3,       label: 'Summary',      href: '/hostel', tab: 'summary' },
  ],
  lodge_manager: [
    { icon: Building2,       label: 'Rooms',        href: '/lodge', tab: 'rooms' },
    { icon: Home,            label: 'Empty Rooms',  href: '/lodge', tab: 'empty' },
    { icon: BarChart3,       label: 'Summary',      href: '/lodge', tab: 'summary' },
  ],
  hospital_admin: [
    { icon: LayoutDashboard, label: 'Overview',     href: '/hospital', tab: 'overview' },
    { icon: Stethoscope,     label: 'Resources',    href: '/hospital', tab: 'resources' },
    { icon: ClipboardList,   label: 'Bookings',     href: '/hospital', tab: 'bookings' },
    { icon: BarChart3,       label: 'Analytics',    href: '/hospital', tab: 'analytics' },
    { icon: UserCheck,       label: 'Staff',        href: '/hospital', tab: 'users' },
  ],
  hospital_doctor: [
    { icon: User,            label: 'My Patients',  href: '/hospital', tab: 'patients' },
    { icon: CalendarPlus,    label: 'Book Resource',href: '/hospital', tab: 'book' },
    { icon: ClipboardList,   label: 'My Bookings',  href: '/hospital', tab: 'bookings' },
  ],
  hospital_reception: [
    { icon: UserCheck,       label: 'Register Patient', href: '/hospital', tab: 'register' },
    { icon: Users,           label: 'Patients',         href: '/hospital', tab: 'patients' },
    { icon: Activity,        label: 'Availability',     href: '/hospital', tab: 'availability' },
    { icon: ClipboardList,   label: 'Bookings',         href: '/hospital', tab: 'bookings' },
  ],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (!user) return null

  const key = `${user.org_type}_${user.role}`
  const items = NAV_MAP[key] || []
  const theme = ORG_THEME[user.org_type] || ORG_THEME.college
  const { OrgIcon } = theme

  const currentTab = new URLSearchParams(location.search).get('tab')

  const isActive = (item) => {
    if (location.pathname !== item.href) return false
    if (item.tab === null) return !currentTab
    return currentTab === item.tab
  }

  const toHref = (item) =>
    item.tab ? `${item.href}?tab=${item.tab}` : item.href

  return (
    <aside className="w-56 flex flex-col min-h-screen" style={{ background: '#0f172a' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`${theme.accent} p-1.5 rounded-lg`}>
            <OrgIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-bold leading-tight">Smart Allocation</p>
            <p className="text-slate-400 text-[10px] capitalize">{theme.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${theme.dot} flex-shrink-0`} />
          <div className="min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{user.username}</p>
            <p className="text-slate-500 text-[10px] capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={`${item.href}-${item.tab}`}
              to={toHref(item)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group
                ${active
                  ? `${theme.accent} text-white shadow-sm ring-1 ${theme.ring}`
                  : `text-slate-400 ${theme.hover} hover:text-slate-100`
                }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${active ? 'scale-105' : 'group-hover:scale-105'}`} />
              <span>{item.label}</span>
              {active && <div className="ml-auto w-1 h-1 rounded-full bg-white/70" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-white/8">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-colors w-full group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-105 transition-transform" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
