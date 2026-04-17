import { useEffect, useState } from 'react'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Check, X, UserCheck } from 'lucide-react'

export default function UserApprovals({ filterRoles }) {
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('pending')

  const load = () => {
    authAPI.orgUsers().then(r => setUsers(r.data)).catch(() => {})
  }
  useEffect(load, [])

  const authorize = async (id, val) => {
    try {
      await authAPI.authorizeUser(id, val)
      toast.success(val ? 'User authorized' : 'Access revoked')
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    }
  }

  const scoped = filterRoles?.length
    ? users.filter(u => filterRoles.includes(u.role))
    : users
  const pending = scoped.filter(u => !u.is_authorized)
  const authorized = scoped.filter(u => u.is_authorized)
  const list = tab === 'pending' ? pending : authorized

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('pending')}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg ${tab === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab('authorized')}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg ${tab === 'authorized' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Authorized ({authorized.length})
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          {tab === 'pending' ? 'No pending user requests.' : 'No authorized users yet.'}
        </div>
      ) : (
        list.map(u => (
          <div key={u.id} className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{u.username}</p>
              <p className="text-xs text-gray-500">
                {u.email} · <span className="capitalize">{u.role}</span>
                {u.department && ` · ${u.department}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_authorized ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {u.is_authorized ? 'Authorized' : 'Pending'}
              </span>
              {!u.is_authorized && (
                <button onClick={() => authorize(u.id, true)} className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <Check className="w-3 h-3" /> Approve
                </button>
              )}
              {u.is_authorized && u.role !== 'admin' && (
                <button onClick={() => authorize(u.id, false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1">
                  <X className="w-3 h-3" /> Revoke
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
