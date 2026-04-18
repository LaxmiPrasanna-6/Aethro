import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, Zap, Shield, Globe, ArrowRight, Play,
  BedDouble, GraduationCap, Hotel, HeartPulse, ChevronRight,
  Sparkles, BarChart3, Clock, CheckCircle,
} from 'lucide-react'

// ── Animation styles ──────────────────────────────────────────────────────────
const STYLES = `
  @keyframes floatY    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes glow      { 0%,100%{opacity:.5} 50%{opacity:1} }
  @keyframes beam      { 0%{stroke-dashoffset:200} 100%{stroke-dashoffset:0} }
  @keyframes scanline  { 0%{top:0%} 100%{top:100%} }
  @keyframes revealUp  { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
  @keyframes revealLeft{ from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes revealRight{from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
  @keyframes starFloat { 0%{opacity:0;transform:translateY(0) scale(0)} 20%{opacity:1} 80%{opacity:.6} 100%{opacity:0;transform:translateY(-80px) scale(1.2)} }
  @keyframes borderSpin{ 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  @keyframes marquee   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes pulseDot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.6} }
  @keyframes countNum  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes blobDrift { 0%,100%{transform:translate(0,0)scale(1)} 33%{transform:translate(30px,-20px)scale(1.08)} 66%{transform:translate(-15px,12px)scale(.94)} }

  .float       { animation: floatY 4s ease-in-out infinite }
  .glow-pulse  { animation: glow 2.5s ease-in-out infinite }
  .beam-line   { stroke-dasharray:200; animation: beam 2s linear infinite }
  .reveal      { opacity:0; }
  .reveal.in   { animation: revealUp .7s cubic-bezier(.4,0,.2,1) forwards }
  .reveal-l    { opacity:0; }
  .reveal-l.in { animation: revealLeft .7s cubic-bezier(.4,0,.2,1) forwards }
  .reveal-r    { opacity:0; }
  .reveal-r.in { animation: revealRight .7s cubic-bezier(.4,0,.2,1) forwards }
  .star-particle { animation: starFloat linear infinite; position:absolute; border-radius:50%; pointer-events:none; background:#67e8f9; }
  .grad-border { position:relative; }
  .grad-border::before {
    content:''; position:absolute; inset:-1px; border-radius:17px; z-index:0;
    background: conic-gradient(from 0deg, transparent 0deg, #22d3ee 60deg, #818cf8 120deg, transparent 180deg);
    animation: borderSpin 4s linear infinite; opacity:0; transition:opacity .3s;
  }
  .grad-border:hover::before { opacity:1; }
  .grad-border > * { position:relative; z-index:1; }
`

// ── Scroll reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('in'); obs.disconnect() }
    }, { threshold: 0.15 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      obs.disconnect()
      const isFloat = String(target).includes('.')
      const num = parseFloat(String(target).replace(/[^0-9.]/g, ''))
      const suffix = String(target).replace(/[0-9.]/g, '')
      let start = null
      const step = (ts) => {
        if (!start) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const cur = isFloat ? (num * eased).toFixed(1) : Math.floor(num * eased)
        setVal(cur + suffix)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])
  return { ref, val: val || (String(target).includes('.') ? '0.0' : '0') + String(target).replace(/[0-9.]/g, '') }
}

// ── Floating star particles ───────────────────────────────────────────────────
function StarField() {
  const stars = useRef(Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 3 + 1,
    duration: `${Math.random() * 6 + 4}s`,
    delay: `${Math.random() * 8}s`,
    opacity: Math.random() * 0.6 + 0.2,
  }))).current
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {stars.map(s => (
        <div key={s.id} className="star-particle" style={{
          left: s.left, bottom: 0,
          width: s.size, height: s.size,
          animationDuration: s.duration,
          animationDelay: s.delay,
          opacity: s.opacity,
        }} />
      ))}
    </div>
  )
}

// ── Stat counter tile ─────────────────────────────────────────────────────────
function StatTile({ value, label }) {
  const { ref, val } = useCountUp(value)
  return (
    <div ref={ref}>
      <div style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(90deg,#22d3ee,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'countNum .6s ease both' }}>{val}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Grid data ─────────────────────────────────────────────────────────────────
function makeGrid(seed) {
  const statuses = ['available', 'available', 'available', 'occupied', 'occupied', 'processing']
  return Array.from({ length: 42 }, (_, i) => ({
    id: i,
    status: statuses[(i * seed + i * 3) % statuses.length],
    label: `R${String(i + 101).slice(-3)}`,
    pulse: i % 7 === 0,
  }))
}

const STATUS_STYLE = {
  available:  { bg: 'rgba(34,197,94,.18)',  border: 'rgba(34,197,94,.5)',  dot: '#22c55e', text: '#86efac' },
  occupied:   { bg: 'rgba(239,68,68,.18)',  border: 'rgba(239,68,68,.5)',  dot: '#ef4444', text: '#fca5a5' },
  processing: { bg: 'rgba(234,179,8,.15)',  border: 'rgba(234,179,8,.45)', dot: '#eab308', text: '#fde047' },
}

function AllocationGrid() {
  const [grid, setGrid] = useState(() => makeGrid(7))
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => {
      setGrid(prev => prev.map(cell =>
        Math.random() < 0.06
          ? { ...cell, status: ['available', 'occupied', 'processing'][Math.floor(Math.random() * 3)] }
          : cell
      ))
      setTick(t => t + 1)
    }, 1800)
    return () => clearInterval(t)
  }, [])

  const avail   = grid.filter(c => c.status === 'available').length
  const occupied = grid.filter(c => c.status === 'occupied').length

  return (
    <div className="relative" style={{ fontFamily: 'monospace' }}>
      <div className="relative rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg,rgba(6,182,212,.08),rgba(99,102,241,.08))',
        border: '1px solid rgba(6,182,212,.25)',
        boxShadow: '0 0 60px rgba(6,182,212,.12), inset 0 1px 0 rgba(255,255,255,.05)',
        padding: '20px',
      }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 glow-pulse" style={{ animation: 'pulseDot 1.5s ease-in-out infinite' }} />
            <span style={{ color: '#67e8f9', fontSize: 11, letterSpacing: 2 }}>LIVE ALLOCATION MATRIX</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span style={{ color: '#86efac' }}>● {avail} Free</span>
            <span style={{ color: '#fca5a5' }}>● {occupied} Used</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 mb-2">
          {['CLASSROOM', 'HOSTEL', 'HOSPITAL'].map(s => (
            <div key={s} className="text-center" style={{ color: 'rgba(148,163,184,.5)', fontSize: 9, letterSpacing: 1.5 }}>{s}</div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[0, 14, 28].map((offset, si) => (
            <div key={si} className="grid grid-cols-3 gap-1">
              {grid.slice(offset, offset + 14).map(cell => {
                const s = STATUS_STYLE[cell.status]
                return (
                  <div key={cell.id} title={`${cell.label} · ${cell.status}`} style={{
                    background: s.bg, border: `1px solid ${s.border}`, borderRadius: 5,
                    padding: '4px 2px', textAlign: 'center', fontSize: 8, color: s.text,
                    transition: 'all .4s ease',
                    boxShadow: cell.pulse ? `0 0 8px ${s.dot}55` : 'none',
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, margin: '0 auto 2px', opacity: cell.pulse ? 1 : 0.7 }} />
                    {cell.label}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" style={{ opacity: 0.25 }}>
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="33%" y1="30%" x2="66%" y2="60%" stroke="url(#lineGrad)" strokeWidth="1" className="beam-line" />
          <line x1="20%" y1="70%" x2="80%" y2="35%" stroke="url(#lineGrad)" strokeWidth="1" className="beam-line" style={{ animationDelay: '1s' }} />
          <line x1="50%" y1="20%" x2="75%" y2="75%" stroke="url(#lineGrad)" strokeWidth="1" className="beam-line" style={{ animationDelay: '.5s' }} />
        </svg>

        <div className="absolute left-0 right-0 pointer-events-none" style={{
          height: 2, background: 'linear-gradient(90deg,transparent,rgba(34,211,238,.15),transparent)',
          animation: 'scanline 4s linear infinite', zIndex: 10,
        }} />

        <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(6,182,212,.15)' }}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" style={{ color: '#818cf8' }} />
            <span style={{ color: '#a5b4fc', fontSize: 10 }}>AI engine active</span>
          </div>
          <div style={{ color: 'rgba(148,163,184,.5)', fontSize: 10 }}>{tick} updates</div>
        </div>
      </div>

      {[
        { label: 'College', icon: GraduationCap, color: '#818cf8', top: '-10px', left: '8%' },
        { label: 'Hostel',  icon: BedDouble,     color: '#f59e0b', top: '-10px', left: '42%' },
        { label: 'Hospital',icon: HeartPulse,    color: '#f87171', top: '-10px', right: '5%' },
      ].map(({ label, icon: Icon, color, ...pos }, i) => (
        <div key={label} className="absolute flex items-center gap-1 px-2 py-1 rounded-full float" style={{
          ...pos,
          background: 'rgba(15,23,42,.9)', border: `1px solid ${color}40`,
          boxShadow: `0 0 12px ${color}30`, fontSize: 10, color,
          animationDelay: `${i * 0.8}s`,
        }}>
          <Icon className="w-3 h-3" /> {label}
        </div>
      ))}
    </div>
  )
}

// ── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain,   color: '#818cf8', glow: 'rgba(129,140,248,.2)', title: 'AI Smart Booking',      desc: 'Natural language booking with NLP. Describe what you need and the system finds the best match instantly.' },
  { icon: Shield,  color: '#22d3ee', glow: 'rgba(34,211,238,.2)',  title: 'Conflict Resolution',   desc: 'Priority-based conflict engine automatically resolves double-bookings and promotes waitlisted requests.' },
  { icon: BarChart3,color:'#34d399', glow: 'rgba(52,211,153,.2)',  title: 'Real-Time Availability',desc: 'Live grid shows available vs occupied resources across all floors, departments, and org types.' },
  { icon: Globe,   color: '#f59e0b', glow: 'rgba(245,158,11,.2)',  title: 'Multi-Domain Support',  desc: 'One platform for Colleges, Hostels, Lodges, and Hospitals — each with role-based dashboards.' },
]

// ── Marquee tech strip ────────────────────────────────────────────────────────
const TECH = ['FastAPI', 'MongoDB', 'React', 'JWT Auth', 'NLP Engine', 'Role-Based Access', 'Real-Time Sync', 'Conflict Detection', 'Demand Forecasting', 'Multi-Org Support']

// ── NLP suggestions ───────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Book a lab for 3 people tomorrow with projector',
  'Find an available ICU ward in cardiology for today',
  'Reserve a hostel room with AC for 2 sharing',
  'Schedule seminar hall for 50 students on Friday',
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Landing() {
  const [suggIdx, setSuggIdx] = useState(0)
  const [typed, setTyped]     = useState('')
  const [typing, setTyping]   = useState(true)

  // Typewriter
  useEffect(() => {
    const target = SUGGESTIONS[suggIdx]
    if (typing) {
      if (typed.length < target.length) {
        const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 45)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setTyping(false), 1800)
        return () => clearTimeout(t)
      }
    } else {
      if (typed.length > 0) {
        const t = setTimeout(() => setTyped(typed.slice(0, -1)), 22)
        return () => clearTimeout(t)
      } else { setSuggIdx(i => (i + 1) % SUGGESTIONS.length); setTyping(true) }
    }
  }, [typed, typing, suggIdx])

  const heroRef     = useReveal()
  const heroRRef    = useReveal()
  const featTitleRef = useReveal()
  const featRefs    = [useReveal(), useReveal(), useReveal(), useReveal()]
  const modulesRef  = useReveal()
  const nlpRef      = useReveal()

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#020817 0%,#0a1628 35%,#0d1f3c 65%,#060f1e 100%)', color: '#e2e8f0', fontFamily: '"Inter",system-ui,sans-serif', overflowX: 'hidden' }}>

        {/* Star particles */}
        <StarField />

        {/* Ambient blobs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '10%', left: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(6,182,212,.07),transparent 70%)', filter: 'blur(40px)', animation: 'blobDrift 12s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '8%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.08),transparent 70%)', filter: 'blur(40px)', animation: 'blobDrift 9s ease-in-out infinite reverse' }} />
          <div style={{ position: 'absolute', top: '55%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,.05),transparent 70%)', filter: 'blur(40px)', animation: 'blobDrift 15s ease-in-out infinite' }} />
        </div>

        {/* ── Navbar ─────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(2,8,23,.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(6,182,212,.12)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#06b6d4,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(6,182,212,.4)' }}>
                <Zap size={16} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, background: 'linear-gradient(90deg,#e2e8f0,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SmartAlloc</span>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              {['Home', 'Features', 'Solutions'].map(n => (
                <a key={n} href={`#${n.toLowerCase()}`} style={{ color: 'rgba(148,163,184,.8)', fontSize: 13, textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => e.target.style.color = '#67e8f9'}
                  onMouseLeave={e => e.target.style.color = 'rgba(148,163,184,.8)'}>{n}</a>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Link to="/login" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', padding: '7px 16px', borderRadius: 8, transition: 'color .2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>Login</Link>
              <Link to="/register" style={{ background: 'linear-gradient(135deg,#0891b2,#6366f1)', color: 'white', fontSize: 13, fontWeight: 600, textDecoration: 'none', padding: '7px 18px', borderRadius: 8, boxShadow: '0 0 20px rgba(6,182,212,.25)', transition: 'all .2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(6,182,212,.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,.25)'; e.currentTarget.style.transform = 'none' }}>Get Started</Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section id="home" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

            <div ref={heroRef} className="reveal-l" style={{ animationDelay: '0s' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', animation: 'pulseDot 1.5s ease-in-out infinite' }} />
                <span style={{ color: '#67e8f9', fontSize: 12, fontWeight: 500, letterSpacing: 1 }}>AI-POWERED PLATFORM</span>
              </div>

              <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15, marginBottom: 12, letterSpacing: -1 }}>
                <span style={{ background: 'linear-gradient(90deg,#f1f5f9,#e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Smart Resource</span>
                <br />
                <span style={{ background: 'linear-gradient(90deg,#22d3ee,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Allocation System</span>
              </h1>
              <p style={{ fontSize: 16, color: '#94a3b8', marginBottom: 8, fontWeight: 500 }}>Intelligent management for Classrooms, Hostels, Lodges & Hospitals</p>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.8, marginBottom: 36, maxWidth: 440 }}>Optimize space, prevent conflicts, and allocate resources intelligently using AI-driven decision systems.</p>

              {/* Animated stats */}
              <div style={{ display: 'flex', gap: 28, marginBottom: 36 }}>
                <StatTile value="4" label="Modules" />
                <StatTile value="99.9%" label="Uptime" />
                <StatTile value="<1s" label="Conflict Detection" />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#0891b2,#6366f1)', color: 'white', fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '12px 24px', borderRadius: 10, boxShadow: '0 0 30px rgba(6,182,212,.3)', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(6,182,212,.5)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 30px rgba(6,182,212,.3)' }}>
                  🚀 Get Started <ArrowRight size={14} />
                </Link>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(148,163,184,.2)', color: '#cbd5e1', fontWeight: 600, fontSize: 14, padding: '12px 22px', borderRadius: 10, cursor: 'pointer', transition: 'all .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.borderColor = 'rgba(6,182,212,.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,.2)' }}>
                  <Play size={14} /> 🎥 Watch Demo
                </button>
              </div>
            </div>

            <div ref={heroRRef} className="reveal-r" style={{ animationDelay: '.15s' }}>
              <AllocationGrid />
            </div>
          </div>
        </section>

        {/* ── Tech marquee ───────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)', padding: '14px 0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', width: 'max-content', animation: 'marquee 20s linear infinite' }}>
            {[...TECH, ...TECH].map((t, i) => (
              <span key={i} style={{ padding: '0 32px', fontSize: 12, color: 'rgba(148,163,184,.5)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#22d3ee', fontSize: 8 }}>◆</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Features ───────────────────────────────────────────── */}
        <section id="features" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '80px 24px 60px' }}>
          <div ref={featTitleRef} className="reveal" style={{ textAlign: 'center', marginBottom: 48, animationDelay: '0s' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(129,140,248,.1)', border: '1px solid rgba(129,140,248,.25)', borderRadius: 999, padding: '4px 14px', marginBottom: 14 }}>
              <Sparkles size={11} color="#a5b4fc" />
              <span style={{ color: '#a5b4fc', fontSize: 11, letterSpacing: 1 }}>CORE FEATURES</span>
            </div>
            <h2 style={{ fontSize: 34, fontWeight: 800, marginBottom: 10, background: 'linear-gradient(90deg,#f1f5f9,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Everything you need, nothing you don't</h2>
            <p style={{ color: '#64748b', fontSize: 14, maxWidth: 500, margin: '0 auto' }}>Powered by AI decision engines, built for real-world institutional workflows.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, color, glow, title, desc }, i) => (
              <div key={title} ref={featRefs[i]} className="reveal grad-border" style={{ animationDelay: `${i * 0.12}s` }}>
                <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: 24, transition: 'all .3s', cursor: 'default', height: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.background = glow; e.currentTarget.style.border = `1px solid ${color}40`; e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = `0 24px 48px ${color}18` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,.07)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, transition: 'transform .3s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'rotate(8deg) scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    <Icon size={20} color={color} />
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Modules row ────────────────────────────────────────── */}
        <section id="solutions" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
          <div ref={modulesRef} className="reveal" style={{ animationDelay: '0s', background: 'linear-gradient(135deg,rgba(6,182,212,.06),rgba(99,102,241,.06))', border: '1px solid rgba(6,182,212,.15)', borderRadius: 20, padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Four domains. One system.</h3>
              <p style={{ fontSize: 13, color: '#64748b' }}>Manage every resource type from a unified, intelligent platform.</p>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { icon: GraduationCap, label: 'College',  color: '#818cf8' },
                { icon: Hotel,         label: 'Hostel',   color: '#f59e0b' },
                { icon: BedDouble,     label: 'Lodge',    color: '#34d399' },
                { icon: HeartPulse,    label: 'Hospital', color: '#f87171' },
              ].map(({ icon: Icon, label, color }, i) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.04)', border: `1px solid ${color}25`, borderRadius: 14, padding: '14px 20px', minWidth: 80, transition: 'all .25s', animationDelay: `${i * 0.08}s` }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 28px ${color}20` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = `${color}25`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
                  <Icon size={22} color={color} />
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI Input demo ───────────────────────────────────────── */}
        <section style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
          <div ref={nlpRef} className="reveal" style={{ animationDelay: '0s' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Just describe what you need</h2>
              <p style={{ fontSize: 13, color: '#64748b' }}>Our NLP engine understands natural language booking requests.</p>
            </div>
            <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(6,182,212,.3)', borderRadius: 16, padding: '5px 5px 5px 20px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 0 40px rgba(6,182,212,.1)' }}>
                <Brain size={18} color="#22d3ee" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, color: '#94a3b8', minHeight: 22 }}>
                  {typed}<span style={{ animation: 'glow 1s infinite', color: '#22d3ee' }}>|</span>
                </span>
                <button style={{ background: 'linear-gradient(135deg,#0891b2,#6366f1)', border: 'none', color: 'white', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 0 20px rgba(6,182,212,.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Book Now <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 }}>
                {SUGGESTIONS.map((s, i) => (
                  <span key={i} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 999, padding: '4px 12px', fontSize: 11, color: '#64748b', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(6,182,212,.3)'; e.currentTarget.style.color = '#67e8f9' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#64748b' }}>
                    {s.length > 38 ? s.slice(0, 38) + '…' : s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.06)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#06b6d4,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={12} color="white" />
            </div>
            <span style={{ color: '#475569', fontSize: 12 }}>© {new Date().getFullYear()} SmartAlloc · Aethronix</span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <CheckCircle size={12} color="#22d3ee" />
            <span style={{ color: '#475569', fontSize: 12 }}>All systems operational</span>
          </div>
        </footer>

      </div>
    </>
  )
}
