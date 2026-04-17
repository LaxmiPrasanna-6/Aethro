import { useState } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import BookingForm from '../../components/booking/BookingForm'
import NLPBooking from '../../components/booking/NLPBooking'
import BookingList from '../../components/booking/BookingList'
import { useAuth } from '../../context/AuthContext'
import { AlertCircle, Sparkles } from 'lucide-react'

const TABS = [
  { id: 'book', label: 'Request Room' },
  { id: 'nlp', label: 'Smart Request' },
  { id: 'bookings', label: 'My Requests' },
]

export default function StudentDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('book')
  const [refresh, setRefresh] = useState(0)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Student (Club Head) Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Club Head Access</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Your requests require admin approval. High-priority approved bookings are fully protected.
                  {user?.club && ` Club: ${user.club}`}
                </p>
              </div>
            </div>

            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="card">
              {activeTab === 'book' && (
                <>
                  <h2 className="font-semibold text-gray-900 mb-1">Request a Room</h2>
                  <p className="text-xs text-gray-500 mb-4">Fill in the details below. Admin must approve before the room is confirmed.</p>
                  <BookingForm orgType="college" onSuccess={() => setRefresh(r => r + 1)} />
                </>
              )}
              {activeTab === 'nlp' && (
                <>
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Smart Request</h2>
                  <NLPBooking onSuccess={() => setRefresh(r => r + 1)} />
                </>
              )}
              {activeTab === 'bookings' && (
                <>
                  <h2 className="font-semibold text-gray-900 mb-4">My Requests</h2>
                  <BookingList filter="my" showActions key={refresh} />
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
