import { useAuth } from '../../context/AuthContext'
import NotificationPanel from './NotificationPanel'
import { User } from 'lucide-react'

export default function Navbar({ title }) {
  const { user } = useAuth()
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <h1 className="font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        <NotificationPanel />
        <div className="flex items-center gap-2">
          <div className="bg-primary-100 p-1.5 rounded-full">
            <User className="w-4 h-4 text-primary-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.username}</span>
        </div>
      </div>
    </header>
  )
}
