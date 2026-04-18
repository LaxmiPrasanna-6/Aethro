import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Sidebar from '../../components/common/Sidebar'
import Navbar from '../../components/common/Navbar'
import BookingForm from '../../components/booking/BookingForm'
import NLPBooking from '../../components/booking/NLPBooking'
import BookingList from '../../components/booking/BookingList'
import { Sparkles, FormInput } from 'lucide-react'

export default function StaffDashboard() {
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'book'
  const [refresh, setRefresh] = useState(0)

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Staff Dashboard" />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <div className="orb w-64 h-64 bg-blue-200 top-[-40px] right-[-40px]" style={{ animationDelay: '2s' }} />
          <div className="max-w-3xl">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Staff Access:</strong> Your bookings are auto-approved instantly.
              </p>
            </div>


            <div className="card page-enter">
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
