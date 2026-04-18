import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'
import {
  Building2, LogIn, GraduationCap, Hotel, HeartPulse, Home,
  ShieldCheck, CalendarCheck, BarChart3, Users,
  Mail, KeyRound, ArrowLeft, RefreshCw, CheckCircle2, Eye, EyeOff,
} from 'lucide-react'

const FEATURES = [
  { icon: GraduationCap, label: 'College',  desc: 'Classrooms, labs & exam seating' },
  { icon: Hotel,         label: 'Hostel',   desc: 'Bed management & occupancy' },
  { icon: Home,          label: 'Lodge',    desc: 'Guest rooms & allocations' },
  { icon: HeartPulse,    label: 'Hospital', desc: 'Wards, ICU & patient workflow' },
]

const HIGHLIGHTS = [
  { icon: ShieldCheck,   text: 'Role-based access control' },
  { icon: CalendarCheck, text: 'Real-time conflict detection' },
  { icon: BarChart3,     text: 'Analytics & demand forecasting' },
  { icon: Users,         text: 'Multi-org, multi-role support' },
]

const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-400'

// ── Animated panel wrapper ─────────────────────────────────────────────────────
function SlidePanel({ children, keyProp }) {
  return (
    <div key={keyProp} style={{ animation: 'slidePanel .35s cubic-bezier(.4,0,.2,1) both' }}>
      {children}
    </div>
  )
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  // Login state
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [view, setView]             = useState('login')   // 'login' | 'forgot-email' | 'forgot-code'
  const [fpEmail, setFpEmail]       = useState('')
  const [fpCode, setFpCode]         = useState('')
  const [fpNewPw, setFpNewPw]       = useState('')
  const [fpConfirm, setFpConfirm]   = useState('')
  const [fpShowPw, setFpShowPw]     = useState(false)
  const [fpLoading, setFpLoading]   = useState(false)
  const [demoCode, setDemoCode]     = useState('')        // shown in UI since no email service

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(`Welcome back, ${user.username}!`)
      const routeMap = {
        college:  { admin: '/college/admin', staff: '/college/staff', student: '/college/student' },
        hostel:   { warden: '/hostel' },
        lodge:    { manager: '/lodge' },
        hospital: { admin: '/hospital', reception: '/hospital', doctor: '/hospital' },
      }
      navigate(routeMap[user.org_type]?.[user.role] || '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSend = async (e) => {
    e.preventDefault()
    setFpLoading(true)
    try {
      const res = await authAPI.forgotPassword(fpEmail)
      // Back-end returns code in demo mode
      if (res.data.code) setDemoCode(res.data.code)
      toast.success('Reset code ready!')
      setView('forgot-code')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send code')
    } finally {
      setFpLoading(false)
    }
  }

  const handleForgotReset = async (e) => {
    e.preventDefault()
    if (fpNewPw !== fpConfirm) { toast.error('Passwords do not match'); return }
    if (fpNewPw.length < 6)   { toast.error('Password must be at least 6 characters'); return }
    setFpLoading(true)
    try {
      await authAPI.resetPassword(fpEmail, fpCode, fpNewPw)
      toast.success('Password reset! Please log in.', { duration: 5000 })
      setView('login')
      setFpEmail(''); setFpCode(''); setFpNewPw(''); setFpConfirm(''); setDemoCode('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed')
    } finally {
      setFpLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes slidePanel {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes blobFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(18px,-14px) scale(1.06); }
          66%      { transform: translate(-10px,8px) scale(.96); }
        }
        @keyframes fadeUpIn {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .left-panel-item { animation: fadeUpIn .6s ease both; }
      `}</style>

      <div className="min-h-screen flex">

        {/* ── Left panel ─────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)' }}>

          {/* Animated blobs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle,#60a5fa,transparent)', animation: 'blobFloat 9s ease-in-out infinite' }} />
          <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle,#818cf8,transparent)', animation: 'blobFloat 12s ease-in-out infinite reverse' }} />
          <div className="absolute top-1/2 left-1/2 w-60 h-60 rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle,#34d399,transparent)', animation: 'blobFloat 7s ease-in-out infinite', transform: 'translate(-50%,-50%)' }} />

          {/* Logo */}
          <div className="relative flex items-center gap-3 left-panel-item" style={{ animationDelay: '.1s' }}>
            <div className="bg-white/10 backdrop-blur-sm p-2.5 rounded-2xl border border-white/20">
              <Building2 className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-white text-xl font-bold tracking-tight">Smart Allocation</h1>
              <p className="text-blue-300 text-xs">Resource Management System</p>
            </div>
          </div>

          {/* Hero */}
          <div className="relative space-y-8">
            <div className="left-panel-item" style={{ animationDelay: '.2s' }}>
              <h2 className="text-white text-4xl font-bold leading-tight tracking-tight">
                One platform.<br />
                <span className="text-blue-300">Every resource.</span>
              </h2>
              <p className="text-blue-200 text-sm mt-3 leading-relaxed max-w-sm">
                Manage rooms, beds, and bookings across colleges, hostels, lodges, and hospitals — all from a single intelligent system.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 left-panel-item" style={{ animationDelay: '.35s' }}>
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label}
                  className="flex items-start gap-3 rounded-xl p-3 border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                  style={{ background: 'rgba(255,255,255,.05)' }}>
                  <div className="bg-blue-500/20 p-1.5 rounded-lg mt-0.5">
                    <Icon className="w-4 h-4 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">{label}</p>
                    <p className="text-blue-300/80 text-xs leading-tight mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 left-panel-item" style={{ animationDelay: '.5s' }}>
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="text-blue-200 text-xs">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-blue-400/60 text-xs left-panel-item" style={{ animationDelay: '.6s' }}>
            © {new Date().getFullYear()} Smart Allocation · Aethronix
          </p>
        </div>

        {/* ── Right panel ────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 p-6">
          <div className="w-full max-w-sm">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
              <div className="bg-primary-600 p-2.5 rounded-2xl">
                <Building2 className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-gray-900 text-lg font-bold">Smart Allocation</h1>
                <p className="text-gray-500 text-xs">Resource Management System</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 overflow-hidden">

              {/* ── LOGIN VIEW ─────────────────────────────────────── */}
              {view === 'login' && (
                <SlidePanel keyProp="login">
                  <div className="mb-7">
                    <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
                      <input type="email" className={inputCls} placeholder="you@example.com" required
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-gray-700">Password</label>
                        <button type="button" onClick={() => { setFpEmail(form.email); setView('forgot-email') }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium hover:underline transition-colors">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="••••••••" required
                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-sm mt-2"
                      style={{ transition: 'all .2s' }}
                      onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,.35)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}>
                      <LogIn className="w-4 h-4" />
                      {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                    <p className="text-sm text-gray-500">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline">
                        Create one
                      </Link>
                    </p>
                  </div>
                </SlidePanel>
              )}

              {/* ── FORGOT — EMAIL STEP ─────────────────────────────── */}
              {view === 'forgot-email' && (
                <SlidePanel keyProp="forgot-email">
                  <button onClick={() => setView('login')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors group">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Back to login
                  </button>

                  <div className="mb-6">
                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                      <Mail className="w-6 h-6 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Forgot password?</h2>
                    <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send you a reset code.</p>
                  </div>

                  <form onSubmit={handleForgotSend} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email address</label>
                      <input type="email" className={inputCls} placeholder="you@example.com" required
                        value={fpEmail} onChange={e => setFpEmail(e.target.value)} autoFocus />
                    </div>

                    <button type="submit" disabled={fpLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
                      {fpLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Reset Code'}
                    </button>
                  </form>
                </SlidePanel>
              )}

              {/* ── FORGOT — CODE + NEW PASSWORD STEP ──────────────── */}
              {view === 'forgot-code' && (
                <SlidePanel keyProp="forgot-code">
                  <button onClick={() => setView('forgot-email')}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-5 transition-colors group">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                    Change email
                  </button>

                  <div className="mb-5">
                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                      <KeyRound className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Enter reset code</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Code sent to <span className="font-medium text-gray-700">{fpEmail}</span>
                    </p>
                  </div>

                  {/* Demo: show the code since no email service */}
                  {demoCode && (
                    <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-xs text-amber-800">
                        Demo mode — your code is: <span className="font-bold text-lg tracking-widest">{demoCode}</span>
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleForgotReset} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">6-Digit Code</label>
                      <input className={inputCls + ' text-center text-lg tracking-[.4em] font-bold'} placeholder="000000"
                        maxLength={6} required value={fpCode} onChange={e => setFpCode(e.target.value.replace(/\D/g, ''))} autoFocus />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                      <div className="relative">
                        <input type={fpShowPw ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="Min 6 characters"
                          required value={fpNewPw} onChange={e => setFpNewPw(e.target.value)} />
                        <button type="button" onClick={() => setFpShowPw(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {fpShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                      <input type="password" className={inputCls} placeholder="Repeat password"
                        required value={fpConfirm} onChange={e => setFpConfirm(e.target.value)} />
                      {fpConfirm && fpNewPw !== fpConfirm && (
                        <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                      )}
                    </div>

                    <button type="submit" disabled={fpLoading || (fpConfirm && fpNewPw !== fpConfirm)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm mt-1">
                      {fpLoading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Resetting…</> : 'Reset Password'}
                    </button>
                  </form>
                </SlidePanel>
              )}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 mt-6">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-gray-400">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
