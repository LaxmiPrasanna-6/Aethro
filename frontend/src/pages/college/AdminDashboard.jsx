import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import ResourceManager from '../../components/admin/ResourceManager'
import BookingApproval from '../../components/admin/BookingApproval'
import Analytics from '../../components/admin/Analytics'
import BookingList from '../../components/booking/BookingList'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Users, Check, X } from 'lucide-react'

function UsersTab() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    authAPI.orgUsers().then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const authorize = async (id, val) => {
    try {
      await authAPI.authorizeUser(id, val)
      toast.success(val ? 'User authorized' : 'User deauthorized')
      authAPI.orgUsers().then(r => setUsers(r.data)).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{users.length} users in organization</p>
      {users.map(u => (
        <div key={u.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{u.username}</p>
            <p className="text-xs text-gray-500">{u.email} · <span className="capitalize">{u.role}</span>
              {u.department && ` · ${u.department}`}
              {u.club && ` · ${u.club}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_authorized ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {u.is_authorized ? 'Authorized' : 'Pending'}
            </span>
            {!u.is_authorized && (
              <button onClick={() => authorize(u.id, true)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Check className="w-3 h-3" /> Authorize
              </button>
            )}
            {u.is_authorized && u.role !== 'admin' && (
              <button onClick={() => authorize(u.id, false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                <X className="w-3 h-3" /> Revoke
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const { user } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="College Admin Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="orb w-80 h-80 bg-violet-200 top-[-80px] right-[-60px]" style={{ animationDelay: '0s' }} />
          <div className="orb w-60 h-60 bg-blue-200 bottom-0 left-0" style={{ animationDelay: '4s' }} />

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 page-enter stagger">
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4">Pending Approvals</h2>
                <BookingApproval />
              </div>
              <div className="card">
                <h2 className="font-semibold text-gray-900 mb-4">All Bookings</h2>
                <BookingList filter="org" />
              </div>
            </div>
          )}
          {activeTab === 'rooms' && (
            <div className="card"><h2 className="font-semibold text-gray-900 mb-4">Room / Lab / Hall Manager</h2><ResourceManager /></div>
          )}
          {activeTab === 'approvals' && (
            <div className="card"><h2 className="font-semibold text-gray-900 mb-4">Booking Approval Queue</h2><BookingApproval /></div>
          )}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'users' && (
            <div className="card"><h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> User Management</h2><UsersTab /></div>
          )}
        </main>
      </div>
    </div>
  )
}
