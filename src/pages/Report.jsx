import { useState, useEffect } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform:rotate(360deg); } }
  @keyframes barIn  { from { width:0 } }
  .unlock-blur { filter:blur(5px); user-select:none; pointer-events:none; opacity:0.45; }
  .email-input:focus { border-color: #2a5c45 !important; box-shadow: 0 0 0 3px rgba(42,92,69,0.08); outline: none; }
  .share-btn:hover { background: #1c1917 !important; border-color: #1c1917 !important; color: #f7f4ef !important; }

  /* ── Mobile overrides ── */
  @media (max-width: 600px) {
    .report-page-pad   { padding: 32px 16px 72px !important; }
    .report-nav        { padding: 0 16px !important; }
    .report-footer     { padding: 20px 16px !important; }
    .score-card        { flex-direction: column !important; align-items: center !important; gap: 24px !important; padding: 28px 20px !important; text-align: center; }
    .score-card-text   { min-width: unset !important; }
    .section-card      { padding: 22px 16px !important; }
    .stat-chips-row    { gap: 8px !important; }
    .stat-chip         { padding: 12px 12px !important; min-width: 0 !important; flex: 1 1 calc(50% - 4px) !important; max-width: calc(50% - 4px) !important; }
    .stat-chip-value   { font-size: 17px !important; }
    .benchmark-row     { gap: 8px !important; }
    .benchmark-label   { font-size: 12px !important; }
    .benchmark-val     { min-width: 44px !important; }
    .benchmark-diff    { min-width: 32px !important; }
    .email-capture     { flex-direction: column !important; gap: 16px !important; padding: 22px 16px !important; }
    .email-right       { min-width: unset !important; width: 100% !important; }
    .unlock-card       { padding: 32px 20px !important; }
    .share-row         { flex-wrap: wrap !important; }
    .check-tags        { gap: 6px !important; }
    .action-card       { padding: 16px !important; }
  }
`

const C = {
  bg:     '#f7f4ef',
  text:   '#1c1917',
  muted:  '#6b6460',
  light:  '#a09890',
  border: 'rgba(28,25,23,0.08)',
  accent: '#2a5c45',
  white:  '#ffffff',
  red:    '#c0392b',
  yellow: '#d68910',
  green:  '#1e8449',
}

const sev = {
  critical:  { color: '#c0392b', bg: '#fdf2f2', label: '🔴 Critical',  border: '#f5c6c6' },
  important: { color: '#d68910', bg: '#fefdf2', label: '🟡 Important', border: '#f5e6a3' },
  quickwin:  { color: '#1e8449', bg: '#f2fdf5', label: '🟢 Quick Win', border: '#a9dfbf' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  const color = score >= 70 ? '#2a5c45' : score >= 40 ? '#d68910' : '#c0392b'
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(28,25,23,0.08)" strokeWidth="8"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
      <text x="70" y="66" textAnchor="middle" fontFamily="Cormorant Garant, serif" fontSize="32" fontWeight="300" fill="#1c1917">{score}</text>
      <text x="70" y="82" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="11" fontWeight="300" fill="#a09890" letterSpacing="2">/100</text>
    </svg>
  )
}

function MetricBar({ label, value }) {
  const pct = Math.min(100, Math.round(value))
  const color = pct >= 70 ? C.green : pct >= 40 ? C.yellow : C.red
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.muted, fontWeight: 300 }}>{label}</span>
        <span style={{ fontSize: 13, color, fontWeight: 400 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(28,25,23,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)' }}/>
      </div>
    </div>
  )
}

function StatChip({ label, value, sub }) {
  return (
    <div className="stat-chip" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.light, marginBottom: 6, fontWeight: 400 }}>{label}</div>
      <div className="stat-chip-value" style={{ fontSize: 20, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.light, marginTop: 3, fontWeight: 300 }}>{sub}</div>}
    </div>
  )
}

function CheckTag({ label, ok }) {
  return (
    <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: ok ? '#f2fdf5' : '#fdf2f2', color: ok ? C.green : C.red, border: `1px solid ${ok ? '#a9dfbf' : '#f5c6c6'}` }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

function IssueTag({ text }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', background: '#fdf2f2', borderRadius: 8, border: '1px solid #f5c6c6' }}>
      <span style={{ color: C.red, flexShrink: 0, fontSize: 12, marginTop: 1 }}>✗</span>
      <span style={{ fontSize: 13, color: C.muted, fontWeight: 300, lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

function BenchmarkRow({ b }) {
  const isAbove = b.direction === 'above'
  return (
    <div className="benchmark-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(28,25,23,0.06)' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <span className="benchmark-label" style={{ fontSize: 13, color: C.muted, fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{b.platform} · {b.metric}</span>
      </div>
      <div className="benchmark-val" style={{ textAlign: 'right', minWidth: 60 }}>
        <span style={{ fontSize: 14, fontWeight: 400, color: C.text }}>{b.yours}</span>
        <div style={{ fontSize: 11, color: C.light }}>yours</div>
      </div>
      <div className="benchmark-diff" style={{ textAlign: 'center', minWidth: 40 }}>
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: isAbove ? 'rgba(42,92,69,0.1)' : 'rgba(192,57,43,0.08)', color: isAbove ? C.accent : C.red, fontWeight: 400 }}>
          {isAbove ? '↑' : '↓'} {b.diff}
        </span>
      </div>
      <div className="benchmark-val" style={{ textAlign: 'right', minWidth: 60 }}>
        <span style={{ fontSize: 14, fontWeight: 300, color: C.light }}>{b.benchmark}</span>
        <div style={{ fontSize: 11, color: C.light }}>avg</div>
      </div>
    </div>
  )
}

function ActionCard({ issue }) {
  const cfg = sev[issue.severity] || sev.quickwin
  return (
    <div className="action-card" style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '20px 24px' }}>
      <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: cfg.color, fontWeight: 400, display: 'block', marginBottom: 6 }}>{cfg.label}</span>
      <p style={{ fontSize: 15, fontWeight: 400, color: C.text, marginBottom: 6 }}>{issue.title}</p>
      <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, fontWeight: 300 }}>{issue.description}</p>
    </div>
  )
}

function UnlockBlock() {
  return (
    <div style={{ position: 'relative', marginTop: 8, background: 'linear-gradient(to bottom, rgba(247,244,239,0) 0%, #f7f4ef 38%)', padding: '80px 0 0', textAlign: 'center' }}>
      <div className="unlock-card" style={{ background: C.white, border: '1px solid rgba(42,92,69,0.2)', borderRadius: 18, padding: '40px 32px', boxShadow: '0 8px 40px rgba(42,92,69,0.09)' }}>
        <div style={{ fontSize: 26, marginBottom: 14 }}>🔒</div>
        <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 26, letterSpacing: '-.015em', marginBottom: 10, color: C.text }}>
          3 more actions in your full report
        </h3>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.72, fontWeight: 300, maxWidth: 400, margin: '0 auto 28px' }}>
          The full report includes every priority action with exact fixes, hook-by-hook content feedback, and a complete brand clarity breakdown.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 360, margin: '0 auto 32px', textAlign: 'left' }}>
          {[
            'All 5 priority actions with exact fixes',
            'Hook quality analysis — post by post',
            'Engagement benchmarks vs. similar accounts',
            'Caption & CTA feedback',
            'Brand clarity score with specific improvements',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ color: C.accent, fontSize: 13, marginTop: 2, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 14, color: C.muted, fontWeight: 300 }}>{item}</span>
            </div>
          ))}
        </div>
        <button style={{
          background: C.text, color: C.bg, border: 'none', borderRadius: 10,
          padding: '15px 36px', fontSize: 15, fontFamily: 'Jost, sans-serif',
          fontWeight: 500, cursor: 'pointer', letterSpacing: '.02em',
          width: '100%', maxWidth: 320, display: 'block', margin: '0 auto 12px',
          transition: 'background .2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = C.accent}
          onMouseLeave={e => e.currentTarget.style.background = C.text}
        >Unlock full report — €9</button>
        <p style={{ fontSize: 12, color: C.light, fontWeight: 300 }}>One-time · No subscription · Instant access</p>
      </div>
    </div>
  )
}

function Section({ title, children, delay, visible }) {
  return (
    <div className="section-card" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: '32px', marginBottom: 20, opacity: 0, animation: visible ? `fadeUp 0.6s ease ${delay}s forwards` : 'none' }}>
      <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.light, marginBottom: 20, fontWeight: 400 }}>{title}</p>
      {children}
    </div>
  )
}

// ─── Error Screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ navigate, error, onRetry }) {
  // Map API error codes to human-readable messages
  const errorInfo = (() => {
    if (error?.code === 'unreachable') return {
      icon: '🌐',
      title: 'Website couldn\'t be reached',
      message: 'We couldn\'t connect to this URL. Double-check the address and make sure the site is live.',
      retry: true,
    }
    if (error?.code === 'timeout') return {
      icon: '⏱',
      title: 'Scan took too long',
      message: 'The website took longer than expected to respond. This happens with very slow sites. Try again — it usually works on the second attempt.',
      retry: true,
    }
    if (error?.code === 'no_data') return {
      icon: '📭',
      title: 'Not enough data to generate a report',
      message: 'We scanned the site but couldn\'t extract enough information. This sometimes happens with heavily JavaScript-rendered pages.',
      retry: false,
    }
    return {
      icon: '⚠️',
      title: 'Something went wrong',
      message: 'An unexpected error occurred during the scan. Please try again — if the problem persists, the site may be blocking automated requests.',
      retry: true,
    }
  })()

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <nav className="report-nav" style={{ borderBottom: `1px solid ${C.border}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', background: 'rgba(247,244,239,0.95)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</button>
        </nav>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>{errorInfo.icon}</div>
          <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 28, letterSpacing: '-.02em', marginBottom: 16, color: C.text }}>
            {errorInfo.title}
          </h1>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, fontWeight: 300, marginBottom: 36 }}>
            {errorInfo.message}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {errorInfo.retry && onRetry && (
              <button
                onClick={onRetry}
                style={{
                  background: C.accent, color: C.white, border: 'none',
                  borderRadius: 10, padding: '13px 28px', fontSize: 14,
                  fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer',
                  transition: 'background .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e4432'}
                onMouseLeave={e => e.currentTarget.style.background = C.accent}
              >
                ↻ Try again
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none', color: C.muted,
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '13px 28px', fontSize: 14,
                fontFamily: 'Jost, sans-serif', fontWeight: 300, cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(28,25,23,0.25)'; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              ← Scan a different URL
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Email Capture ─────────────────────────────────────────────────────────

function EmailCapture({ reportId, visible }) {
  const [email, setEmail]               = useState('')
  const [emailSent, setEmailSent]       = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError]     = useState('')

  if (!reportId) return null

  const handleSubmit = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setEmailLoading(true)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, email }),
      })
      const data = await res.json()
      if (data.ok) {
        setEmailSent(true)
      } else {
        setEmailError(data.error || 'Something went wrong. Try again.')
      }
    } catch {
      setEmailError('Something went wrong. Try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  return (
    <div className="email-capture" style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 16,
      padding: '28px 32px', marginBottom: 20,
      opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0.12s forwards' : 'none',
      display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.light, fontWeight: 400, marginBottom: 6 }}>
          Get your report by email
        </p>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65, fontWeight: 300 }}>
          We'll send you this report and occasional tips to improve your score.
        </p>
      </div>
      <div className="email-right" style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 260 }}>
        {emailSent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: C.accent, fontWeight: 400, padding: '10px 0' }}>
            <span style={{ fontSize: 16 }}>✓</span> Sent — check your inbox.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="email-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{
                  flex: 1, border: `1px solid ${emailError ? C.red : C.border}`,
                  borderRadius: 8, padding: '10px 14px', fontSize: 14,
                  fontFamily: 'Jost, sans-serif', fontWeight: 300, color: C.text,
                  background: C.bg, outline: 'none', transition: 'border-color .2s, box-shadow .2s',
                  minWidth: 0,
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={emailLoading}
                style={{
                  background: C.accent, color: C.white, border: 'none',
                  borderRadius: 8, padding: '10px 18px', fontSize: 13,
                  fontFamily: 'Jost, sans-serif', fontWeight: 500,
                  cursor: emailLoading ? 'default' : 'pointer',
                  opacity: emailLoading ? 0.7 : 1, transition: 'opacity .2s',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {emailLoading ? '…' : 'Send me this'}
              </button>
            </div>
            {emailError && <p style={{ fontSize: 12, color: C.red, fontWeight: 300, margin: 0 }}>{emailError}</p>}
            <p style={{ fontSize: 11, color: C.light, fontWeight: 300, margin: 0 }}>
              By submitting you agree to receive this report and tips from Scano.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Share Button ─────────────────────────────────────────────────────────────

function ShareButton({ reportId }) {
  const [copied, setCopied] = useState(false)

  const shareUrl = reportId
    ? `${window.location.origin}/report/${reportId}`
    : window.location.href

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = shareUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="share-row" style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button
        className="share-btn"
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: copied ? C.accent : C.white,
          color: copied ? C.white : C.text,
          border: `1px solid ${copied ? C.accent : C.border}`,
          borderRadius: 9, padding: '9px 18px', fontSize: 13,
          fontFamily: 'Jost, sans-serif', fontWeight: 400,
          cursor: 'pointer', transition: 'all .2s',
        }}
      >
        {copied ? '✓ Link copied!' : '↗ Share this report'}
      </button>
      {reportId && (
        <span style={{ fontSize: 12, color: C.light, fontWeight: 300, wordBreak: 'break-all' }}>
          scano.io/report/{reportId.slice(0, 8)}…
        </span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Report({ navigate, scanData, reportData, websiteUrl, reportId, scanError, onRetry }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  // ── Error state ──
  if (scanError) {
    return <ErrorScreen navigate={navigate} error={scanError} onRetry={onRetry} />
  }

  // ── Loading state ──
  if (!scanData || !reportData) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(28,25,23,0.15)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
          <p style={{ fontSize: 14, color: C.light, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Loading your report…</p>
        </div>
      </>
    )
  }

  const { score, website, content, tiktok, instagram, youtube, twitter, benchmarkData } = scanData
  const { headline, summary, websiteAnalysis, copyAnalysis, socialAnalysis, topIssues }  = reportData

  const scoreColor = score >= 70 ? C.accent : score >= 40 ? C.yellow : C.red
  const scoreLabel = score >= 70 ? 'Strong' : score >= 40 ? 'Needs Work' : 'Critical Issues'

  const visibleActions = topIssues?.slice(0, 2) || []
  const lockedActions  = topIssues?.slice(2)    || []
  const hasSocial      = tiktok || instagram || youtube || twitter
  const hasBenchmarks  = benchmarkData?.benchmarks?.length > 0

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg }}>

        {/* Nav */}
        <nav className="report-nav" style={{ borderBottom: `1px solid ${C.border}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</button>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.light, fontFamily: 'Jost, sans-serif', fontWeight: 300, transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = C.text}
            onMouseLeave={e => e.target.style.color = C.light}
          >← New scan</button>
        </nav>

        <div className="report-page-pad" style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 96px' }}>

          {/* Header */}
          <div style={{ marginBottom: 48, opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0s forwards' : 'none' }}>
            <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>
              Free Audit Report{benchmarkData?.industryLabel ? ` · ${benchmarkData.industryLabel}` : ''}
            </p>
            <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(20px,4vw,40px)', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 8, wordBreak: 'break-word' }}>
              {websiteUrl}
            </h1>
            <p style={{ fontSize: 13, color: C.light }}>
              {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <ShareButton reportId={reportId} />
          </div>

          {/* Score */}
          <div className="score-card" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px', marginBottom: 20, display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0.1s forwards' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ScoreRing score={score} />
              <span style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: scoreColor, fontWeight: 400 }}>{scoreLabel}</span>
            </div>
            <div className="score-card-text" style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 22, letterSpacing: '-.01em', marginBottom: 12, lineHeight: 1.3 }}>{headline}</h2>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, fontWeight: 300 }}>{summary}</p>
            </div>
          </div>

          {/* Email capture */}
          <EmailCapture reportId={reportId} visible={visible} />

          {/* Score breakdown */}
          {(website || content) && (
            <Section title="Score Breakdown" delay={0.15} visible={visible}>
              {website        && <MetricBar label="Website Performance" value={website.performanceScore} />}
              {content?.seo   && <MetricBar label="SEO"                 value={content.seo.score} />}
              {content?.copy  && <MetricBar label="Copy & UX"           value={content.copy.score} />}
              {website        && <MetricBar label="Accessibility"       value={website.accessibilityScore} />}
            </Section>
          )}

          {/* Website Performance */}
          {website && (
            <Section title="Website Performance" delay={0.2} visible={visible}>
              <div className="stat-chips-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatChip label="Performance"   value={website.performanceScore}      sub="mobile" />
                <StatChip label="Accessibility" value={website.accessibilityScore} />
                <StatChip label="LCP"           value={website.coreWebVitals.lcp} />
                <StatChip label="FCP"           value={website.coreWebVitals.fcp} />
              </div>
              <div className="check-tags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <CheckTag label="HTTPS"     ok={website.technical.hasHttps} />
                <CheckTag label="Mobile"    ok={website.technical.mobileOptimized} />
                <CheckTag label="No popups" ok={website.technical.noIntrusive} />
                <CheckTag label="Font size" ok={website.technical.fontSizeOk} />
              </div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, fontWeight: 300 }}>{websiteAnalysis}</p>
            </Section>
          )}

          {/* SEO */}
          {content?.seo && (
            <Section title="SEO Analysis" delay={0.25} visible={visible}>
              <div className="stat-chips-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <StatChip label="SEO Score"    value={content.seo.score}            sub="our deep scan" />
                <StatChip label="Title length" value={`${content.seo.titleLength}c`} sub={content.seo.titleLength >= 30 && content.seo.titleLength <= 65 ? '✓ good' : '✗ off'} />
                <StatChip label="Alt coverage" value={`${content.seo.imgAltScore}%`} sub="images" />
              </div>
              {content.seo.title && (
                <div style={{ background: 'rgba(28,25,23,0.03)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, border: '1px solid rgba(28,25,23,0.07)' }}>
                  <p style={{ fontSize: 11, color: C.light, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Page title</p>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 300 }}>"{content.seo.title}"</p>
                </div>
              )}
              {content.seo.metaDesc && (
                <div style={{ background: 'rgba(28,25,23,0.03)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, border: '1px solid rgba(28,25,23,0.07)' }}>
                  <p style={{ fontSize: 11, color: C.light, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Meta description</p>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 300 }}>"{content.seo.metaDesc.slice(0, 120)}{content.seo.metaDesc.length > 120 ? '…' : ''}"</p>
                </div>
              )}
              <div className="check-tags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: content.seo.issues.length > 0 ? 16 : 0 }}>
                <CheckTag label="Canonical"   ok={content.seo.canonicalPresent} />
                <CheckTag label="Open Graph"  ok={content.seo.ogTitlePresent} />
                <CheckTag label="Schema.org"  ok={content.seo.structuredData} />
                <CheckTag label={`${content.seo.h1s.length} H1`} ok={content.seo.h1s.length === 1} />
              </div>
              {content.seo.issues.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  {content.seo.issues.map((issue, i) => <IssueTag key={i} text={issue} />)}
                </div>
              )}
            </Section>
          )}

          {/* Copy & UX */}
          {content?.copy && (
            <Section title="Copy & UX Analysis" delay={0.3} visible={visible}>
              <div className="stat-chips-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                <StatChip label="Copy Score" value={content.copy.score} sub="out of 100" />
                {!content.copy.isSPA && (
                  <StatChip label="Word count" value={content.copy.wordCount} sub="on page" />
                )}
              </div>
              {content.copy.isSPA && (
                <div style={{ background: 'rgba(42,92,69,0.05)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, border: '1px solid rgba(42,92,69,0.12)' }}>
                  <p style={{ fontSize: 13, color: '#2a5c45', fontWeight: 300 }}>ℹ️ JavaScript-rendered site — copy analysis is based on available static data. Word count is not shown.</p>
                </div>
              )}
              {content.copy.heroHeadline && (
                <div style={{ background: content.copy.isOutcomeFocused ? 'rgba(42,92,69,0.05)' : 'rgba(192,57,43,0.05)', borderRadius: 8, padding: '14px 16px', marginBottom: 16, border: `1px solid ${content.copy.isOutcomeFocused ? 'rgba(42,92,69,0.15)' : 'rgba(192,57,43,0.15)'}` }}>
                  <p style={{ fontSize: 11, color: C.light, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
                    Hero headline — {content.copy.isOutcomeFocused ? '✓ outcome-focused' : '✗ not outcome-focused'}
                  </p>
                  <p style={{ fontSize: 15, color: C.text, fontWeight: 300, fontStyle: 'italic' }}>"{content.copy.heroHeadline}"</p>
                </div>
              )}
              <div className="check-tags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <CheckTag label="Clear CTA"                ok={content.copy.hasCTA} />
                <CheckTag label="Social proof"             ok={content.copy.hasSocialProof} />
                <CheckTag label="Price visible"            ok={content.copy.hasPriceVisible} />
                <CheckTag label="Outcome-focused headline" ok={content.copy.isOutcomeFocused} />
              </div>
              {copyAnalysis && <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, fontWeight: 300 }}>{copyAnalysis}</p>}
              {content.copy.issues.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  {content.copy.issues.map((issue, i) => <IssueTag key={i} text={issue} />)}
                </div>
              )}
            </Section>
          )}

          {/* Social + Benchmarks */}
          {hasSocial && (
            <Section title={`Social Media${benchmarkData?.industryLabel ? ` · vs ${benchmarkData.industryLabel} average` : ''}`} delay={0.35} visible={visible}>
              <div className="stat-chips-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                {tiktok    && <StatChip label="TikTok"      value={tiktok.followers?.toLocaleString()}    sub={`${tiktok.engagementRate}% eng`} />}
                {tiktok    && <StatChip label="Avg Views"   value={tiktok.avgViews?.toLocaleString()}     sub="per video" />}
                {instagram && <StatChip label="Instagram"   value={instagram.followers?.toLocaleString()} sub={`${instagram.engagementRate}% eng`} />}
                {youtube   && <StatChip label="YouTube"     value={youtube.subscribers?.toLocaleString()} sub="subscribers" />}
                {twitter   && <StatChip label="X / Twitter" value={twitter.followers?.toLocaleString()}   sub="followers" />}
              </div>
              {hasBenchmarks && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: C.light, marginBottom: 12, fontWeight: 300 }}>Compared to {benchmarkData.industryLabel} accounts</p>
                  {benchmarkData.benchmarks.map((b, i) => <BenchmarkRow key={i} b={b} />)}
                </div>
              )}
              {socialAnalysis && socialAnalysis !== 'null' && (
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, fontWeight: 300, marginTop: 16 }}>{socialAnalysis}</p>
              )}
            </Section>
          )}

          {/* Priority Actions */}
          <div style={{ opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0.4s forwards' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
              <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.light, fontWeight: 400 }}>Priority Actions</p>
              <p style={{ fontSize: 12, color: C.light, fontWeight: 300 }}>2 of {topIssues?.length || 5} shown</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {visibleActions.map((issue, i) => <ActionCard key={i} issue={issue} />)}
            </div>
            {lockedActions.length > 0 && (
              <div style={{ position: 'relative', marginTop: 12 }}>
                <div className="unlock-blur" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lockedActions.map((issue, i) => <ActionCard key={i} issue={issue} />)}
                </div>
                <UnlockBlock />
              </div>
            )}
          </div>

          {/* Footer button */}
          <div style={{ marginTop: 56, textAlign: 'center', opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0.5s forwards' : 'none' }}>
            <button onClick={() => navigate('/')}
              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 28px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 300, cursor: 'pointer', color: C.muted, transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(28,25,23,0.3)'; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >← Run another scan</button>
          </div>
        </div>

        {/* Footer */}
        <div className="report-footer" style={{ borderTop: `1px solid ${C.border}`, padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: C.light, fontWeight: 300 }}>© 2026 Scano</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => navigate('/privacy')}   style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.light, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Privacy Policy</button>
            <button onClick={() => navigate('/impressum')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.light, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Impressum</button>
          </div>
        </div>

      </div>
    </>
  )
}