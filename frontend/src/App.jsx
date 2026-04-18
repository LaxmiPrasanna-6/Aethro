import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/college/AdminDashboard'
import StaffDashboard from './pages/college/StaffDashboard'
import StudentDashboard from './pages/college/StudentDashboard'
import WardenDashboard from './pages/hostel/WardenDashboard'
import ManagerDashboard from './pages/lodge/ManagerDashboard'
import HospitalDashboard from './pages/hospital/HospitalDashboard'
import ExamSeating from './pages/exam/ExamSeating'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  // Also check localStorage token as a synchronous fallback to avoid the
  // race where navigate() fires before setUser() re-renders the context.
  const hasToken = Boolean(localStorage.getItem('token'))
  if (!user && !hasToken) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const authed = user || Boolean(localStorage.getItem('token'))

  return (
    <Routes>
      <Route path="/login" element={authed ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={authed ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/college/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/college/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
      <Route path="/college/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/hostel" element={<ProtectedRoute><WardenDashboard /></ProtectedRoute>} />
      <Route path="/lodge" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
      <Route path="/hospital" element={<ProtectedRoute><HospitalDashboard /></ProtectedRoute>} />
      <Route path="/exam" element={<ProtectedRoute><ExamSeating /></ProtectedRoute>} />
      <Route path="/" element={authed ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
