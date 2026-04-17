import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/college/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/college/staff" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
      <Route path="/college/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      <Route path="/hostel" element={<ProtectedRoute><WardenDashboard /></ProtectedRoute>} />
      <Route path="/lodge" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
      <Route path="/hospital" element={<ProtectedRoute><HospitalDashboard /></ProtectedRoute>} />
      <Route path="/exam" element={<ProtectedRoute><ExamSeating /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
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
