import { useState } from 'react'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import BookingForm from '../../components/booking/BookingForm'
import NLPBooking from '../../components/booking/NLPBooking'
import BookingList from '../../components/booking/BookingList'
import { Sparkles, FormInput } from 'lucide-react'

const TABS = [
  { id: 'book', label: 'Book Room' },
  { id: 'nlp', label: 'Smart Book (NLP)' },
  { id: 'bookings', label: 'My Bookings' },
]

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('book')
  const [refresh, setRefresh] = useState(0)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Staff Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Staff Access:</strong> Your bookings are auto-approved instantly.
              </p>
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
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FormInput className="w-4 h-4" /> Book a Room</h2>
                  <BookingForm orgType="college" onSuccess={() => setRefresh(r => r + 1)} />
                </>
              )}
              {activeTab === 'nlp' && (
                <>
                  <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Smart Booking</h2>
                  <NLPBooking onSuccess={() => setRefresh(r => r + 1)} />
                </>
              )}
              {activeTab === 'bookings' && (
                <>
                  <h2 className="font-semibold text-gray-900 mb-4">My Bookings</h2>
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
