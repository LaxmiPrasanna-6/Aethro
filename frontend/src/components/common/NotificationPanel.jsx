import { useState, useEffect } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { bookingAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)

  const load = async () => {
    try {
      const res = await bookingAPI.notifications()
      setNotifications(res.data)
      setUnread(res.data.filter(n => !n.is_read).length)
    } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  const markAll = async () => {
    await bookingAPI.markAllRead()
    setNotifications(n => n.map(x => ({ ...x, is_read: true })))
    setUnread(0)
  }

  const TYPE_COLORS = {
    approval: 'bg-green-100 border-green-300',
    rejection: 'bg-red-100 border-red-300',
    reassignment: 'bg-blue-100 border-blue-300',
    waitlist: 'bg-yellow-100 border-yellow-300',
    cancellation: 'bg-gray-100 border-gray-300',
    default: 'bg-white border-gray-200',
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-gray-600 hover:text-gray-900">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-3 border-b text-sm border ${TYPE_COLORS[n.type] || TYPE_COLORS.default} ${!n.is_read ? 'font-medium' : 'text-gray-600'}`}>
                  <p>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
