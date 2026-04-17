import { useState, useEffect } from 'react'
import { analyticsAPI } from '../../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, Users, Building2, Calendar } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function StatCard({ icon: Icon, label, value, color = 'text-primary-600' }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value ?? '–'}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gray-50 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const [dashboard, setDashboard] = useState(null)
  const [trends, setTrends] = useState([])
  const [priority, setPriority] = useState([])
  const [demand, setDemand] = useState([])

  useEffect(() => {
    analyticsAPI.dashboard().then(r => setDashboard(r.data)).catch(() => {})
    analyticsAPI.trends().then(r => setTrends(r.data.trends || [])).catch(() => {})
    analyticsAPI.priorityBreakdown().then(r => {
      setPriority(Object.entries(r.data).map(([k, v]) => ({ name: k, value: v })))
    }).catch(() => {})
    analyticsAPI.demandForecast('classroom').then(r => {
      setDemand(Object.entries(r.data).map(([day, count]) => ({ day, count })))
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} label="Total Resources" value={dashboard.resources.total} />
          <StatCard icon={Building2} label="Available Now" value={dashboard.resources.available} color="text-green-600" />
          <StatCard icon={Calendar} label="Total Bookings" value={dashboard.bookings.total} />
          <StatCard icon={Users} label="Registered Users" value={dashboard.users.total} />
        </div>
      )}

      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Pending', val: dashboard.bookings.pending, color: 'text-yellow-600 bg-yellow-50' },
            { label: 'Approved', val: dashboard.bookings.approved, color: 'text-green-600 bg-green-50' },
            { label: 'Rejected', val: dashboard.bookings.rejected, color: 'text-red-600 bg-red-50' },
            { label: 'No Shows', val: dashboard.bookings.no_shows, color: 'text-gray-600 bg-gray-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.val}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trends.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-sm text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Booking Trends
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trends.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {priority.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-sm text-gray-700 mb-4">Priority Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={priority} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {priority.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {demand.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-sm text-gray-700 mb-4">Demand by Day of Week (Forecast)</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={demand}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
