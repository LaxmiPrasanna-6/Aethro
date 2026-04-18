import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
  me: () => api.get('/auth/me'),
  orgUsers: () => api.get('/auth/org/users'),
  authorizeUser: (userId, authorized) => api.patch(`/auth/users/${userId}/authorize?authorized=${authorized}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, code, new_password) => api.post('/auth/reset-password', { email, code, new_password }),
}

// Booking
export const bookingAPI = {
  create: (data) => api.post('/booking/', data),
  nlp: (raw_text) => api.post('/booking/nlp', { raw_text }),
  myBookings: (status) => api.get('/booking/my', { params: { status } }),
  orgBookings: (status, date) => api.get('/booking/org', { params: { status, date } }),
  pending: () => api.get('/booking/pending'),
  action: (id, data) => api.patch(`/booking/${id}/action`, data),
  cancel: (id) => api.delete(`/booking/${id}`),
  noShow: (id) => api.patch(`/booking/${id}/no-show`),
  notifications: (unreadOnly) => api.get('/booking/notifications', { params: { unread_only: unreadOnly } }),
  markRead: (id) => api.patch(`/booking/notifications/${id}/read`),
  markAllRead: () => api.patch('/booking/notifications/read-all'),
  availableRooms: (orgType, filters) => {
    const path = orgType === 'hospital'
      ? '/hospital/resources/available'
      : `/${orgType}/rooms/available`
    return api.post(path, filters)
  },
}

// College
export const collegeAPI = {
  addRoom: (data) => api.post('/college/rooms', data),
  getRooms: () => api.get('/college/rooms'),
  availableRooms: (filters) => api.post('/college/rooms/available', filters),
  updateRoom: (id, data) => api.patch(`/college/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/college/rooms/${id}`),
  blueprint: () => api.get('/college/blueprint'),
  departments: () => api.get('/college/departments'),
}

// Hostel
export const hostelAPI = {
  addRoom: (data) => api.post('/hostel/rooms', data),
  getRooms: () => api.get('/hostel/rooms'),
  availableRooms: (filters) => api.post('/hostel/rooms/available', filters),
  occupyBed: (id, beds) => api.patch(`/hostel/rooms/${id}/occupy?beds=${beds}`),
  vacateBed: (id, beds) => api.patch(`/hostel/rooms/${id}/vacate?beds=${beds}`),
  summary: () => api.get('/hostel/occupancy-summary'),
  uploadDocx: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/hostel/rooms/upload-docx', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  downloadTemplate: () => api.get('/hostel/rooms/docx-template', { responseType: 'blob' }),
  emptyRooms: () => api.get('/hostel/rooms/empty'),
}

// Lodge
export const lodgeAPI = {
  addRoom: (data) => api.post('/lodge/rooms', data),
  getRooms: () => api.get('/lodge/rooms'),
  filterRooms: (filters) => api.post('/lodge/rooms/filter', filters),
  allocate: (id, count) => api.patch(`/lodge/rooms/${id}/allocate?guest_count=${count}`),
  release: (id, count) => api.patch(`/lodge/rooms/${id}/release?guests=${count}`),
  summary: () => api.get('/lodge/availability-summary'),
  uploadDocx: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/lodge/rooms/upload-docx', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  downloadTemplate: () => api.get('/lodge/rooms/docx-template', { responseType: 'blob' }),
  emptyRooms: () => api.get('/lodge/rooms/empty'),
}

// Hospital
export const hospitalAPI = {
  addResource: (data) => api.post('/hospital/resources', data),
  getResources: (params) => api.get('/hospital/resources', { params }),
  availableResources: (filters) => api.post('/hospital/resources/available', filters),
  demandForecast: (type) => api.get('/hospital/demand-forecast', { params: { resource_type: type } }),
  reputationReport: () => api.get('/hospital/reputation-report'),
  bundleBooking: (data) => api.post('/hospital/bundle-booking', data),
  proximityResources: (dept, type) => api.get('/hospital/proximity-resources', { params: { department: dept, resource_type: type } }),
  uploadDocx: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/hospital/resources/upload-docx', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  downloadTemplate: () => api.get('/hospital/resources/docx-template', { responseType: 'blob' }),
  // Patients
  registerPatient: (data) => api.post('/hospital/patients', data),
  getPatients: (status) => api.get('/hospital/patients', { params: status ? { status } : {} }),
  updatePatient: (id, data) => api.patch(`/hospital/patients/${id}`, data),
  // Doctors
  getDoctors: () => api.get('/hospital/doctors'),
  suggestDoctor: (symptoms) => api.post('/hospital/doctors/suggest', symptoms),
  setAvailability: (status) => api.patch('/hospital/doctors/availability', null, { params: { status } }),
  // Availability
  availabilitySummary: () => api.get('/hospital/availability'),
}

// Analytics
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  trends: () => api.get('/analytics/booking-trends'),
  roomUsage: () => api.get('/analytics/room-usage'),
  demandForecast: (type) => api.get('/analytics/demand-forecast', { params: { resource_type: type } }),
  priorityBreakdown: () => api.get('/analytics/priority-breakdown'),
}

// Exam
export const examAPI = {
  createSession: (data) => api.post('/exam/sessions', data),
  listSessions: () => api.get('/exam/sessions'),
  getSession: (id) => api.get(`/exam/sessions/${id}`),
  allocate: (id, data) => api.post(`/exam/sessions/${id}/allocate`, data),
  downloadStudentTemplate: () => api.get('/exam/students/docx-template', { responseType: 'blob' }),
  previewStudentDocx: (formData) => api.post('/exam/students/preview-docx', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadStudentDocx: (formData) => api.post('/exam/students/upload-docx', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addStudent: (data) => api.post('/exam/students', data),
  bulkStudents: (students) => api.post('/exam/students/bulk', { students }),
  listStudents: () => api.get('/exam/students'),
  resetSeating: (id) => api.delete(`/exam/sessions/${id}/seating`),
}

export default api
