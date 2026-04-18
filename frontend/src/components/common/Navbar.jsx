import { useAuth } from '../../context/AuthContext'
import NotificationPanel from './NotificationPanel'
import { User, ChevronRight } from 'lucide-react'

const ORG_ACCENT = {
  college:  'bg-violet-100 text-violet-700',
  hostel:   'bg-amber-100 text-amber-700',
  lodge:    'bg-emerald-100 text-emerald-700',
  hospital: 'bg-rose-100 text-rose-700',
}

export default function Navbar({ title }) {
  const { user } = useAuth()
  const accentCls = ORG_ACCENT[user?.org_type] || 'bg-primary-100 text-primary-700'

  return (
    <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between shadow-sm flex-shrink-0">
      {/* Left: breadcrumb-style title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-gray-400 capitalize hidden sm:block">{user?.org_type}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 hidden sm:block flex-shrink-0" />
        <h1 className="text-sm font-semibold text-gray-800 truncate">{title}</h1>
      </div>

      {/* Right: notifications + user chip */}
      <div className="flex items-center gap-3">
        <NotificationPanel />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${accentCls} text-xs font-semibold`}>
          <User className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate max-w-[120px]">{user?.username}</span>
          <span className="opacity-60 capitalize hidden sm:inline">· {user?.role}</span>
        </div>
      </div>
    </header>
  )
}
