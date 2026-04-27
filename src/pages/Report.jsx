import { useState, useEffect, useRef } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scoreCount {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes barFill {
    from { width: 0%; }
    to { width: var(--target); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .fade-up { animation: fadeUp 0.6s ease forwards; }
  .score-anim { animation: scoreCount 0.8s cubic-bezier(0.34,1.56,0.64,1) forwards; }
`

const severityConfig = {
  critical: { color: '#c0392b', bg: '#fdf2f2', label: '🔴 Critical', border: '#f5c6c6' },
  important: { color: '#d68910', bg: '#fefdf2', label: '🟡 Important', border: '#f5e6a3' },
  quickwin: { color: '#1e8449', bg: '#f2fdf5', label: '🟢 Quick Win', border: '#a9dfbf' },
}

function ScoreRing({ score }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 70 ? '#2a5c45' : score >= 40 ? '#d68910' : '#c0392b'

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ display: 'block' }}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(28,25,23,0.08)" strokeWidth="8" />
      <circle
        cx="70" cy="70" r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="70" y="66" textAnchor="middle" fontFamily="Cormorant Garant, serif" fontSize="32" fontWeight="300" fill="#1c1917">{score}</text>
      <text x="70" y="82" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="11" fontWeight="300" fill="#a09890" letterSpacing="2">/100</text>
    </svg>
  )
}

function MetricBar({ label, value, max = 100 }) {
  const pct = Math.round((value / max) * 100)
  const color = pct >= 70 ? '#2a5c45' : pct >= 40 ? '#d68910' : '#c0392b'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#6b6460', fontWeight: 300 }}>{label}</span>
        <span style={{ fontSize: 13, color, fontWeight: 400 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(28,25,23,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 2,
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function StatChip({ label, value }) {
  return (
    <div style={{ background: 'white', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a09890', marginBottom: 6, fontWeight: 400 }}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: '#1c1917' }}>{value}</div>
    </div>
  )
}

export default function Report({ navigate, scanData, reportData, websiteUrl }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setTimeout(() => setVisible(true), 100)
  }, [])

  if (!scanData || !reportData) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(28,25,23,0.15)', borderTopColor: '#2a5c45', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 14, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Loading your report…</p>
        </div>
      </>
    )
  }

  const { score, website, tiktok, instagram, youtube } = scanData
  const { headline, summary, websiteAnalysis, socialAnalysis, topIssues } = reportData
  const scoreColor = score >= 70 ? '#2a5c45' : score >= 40 ? '#d68910' : '#c0392b'
  const scoreLabel = score >= 70 ? 'Strong' : score >= 40 ? 'Needs Work' : 'Critical Issues'

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef' }}>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid rgba(28,25,23,0.08)', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: '#1c1917' }}>
            Scano
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}
            onMouseEnter={e => e.target.style.color = '#1c1917'}
            onMouseLeave={e => e.target.style.color = '#a09890'}
          >← New scan</button>
        </nav>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 96px' }}>

          {/* Header */}
          <div style={{ marginBottom: 48, animation: visible ? 'fadeUp 0.6s ease forwards' : 'none', opacity: 0 }}>
            <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2a5c45', marginBottom: 12, fontWeight: 400 }}>Audit Report</p>
            <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 8 }}>{websiteUrl}</h1>
            <p style={{ fontSize: 13, color: '#a09890' }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {/* Score card */}
          <div style={{ background: 'white', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 16, padding: '40px', marginBottom: 32, display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', animation: visible ? 'fadeUp 0.6s ease 0.1s forwards' : 'none', opacity: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <ScoreRing score={score} />
              <span style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: scoreColor, fontWeight: 400 }}>{scoreLabel}</span>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 22, letterSpacing: '-.01em', marginBottom: 12, lineHeight: 1.3 }}>{headline}</h2>
              <p style={{ fontSize: 15, color: '#6b6460', lineHeight: 1.75, fontWeight: 300 }}>{summary}</p>
            </div>
          </div>

          {/* Website section */}
          {website && (
            <div style={{ background: 'white', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 16, padding: '32px', marginBottom: 20, animation: visible ? 'fadeUp 0.6s ease 0.2s forwards' : 'none', opacity: 0 }}>
              <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09890', marginBottom: 20, fontWeight: 400 }}>Website</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatChip label="Performance" value={`${website.performanceScore}`} />
                <StatChip label="SEO" value={`${website.seoScore}`} />
                <StatChip label="Accessibility" value={`${website.accessibilityScore}`} />
                <StatChip label="LCP" value={website.coreWebVitals.lcp} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <MetricBar label="Performance" value={website.performanceScore} />
                <MetricBar label="SEO" value={website.seoScore} />
                <MetricBar label="Accessibility" value={website.accessibilityScore} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {[
                  { label: 'HTTPS', ok: website.technical.hasHttps },
                  { label: 'Meta Title', ok: website.technical.metaTitle },
                  { label: 'Meta Desc', ok: website.technical.metaDescription },
                  { label: 'Mobile', ok: website.technical.mobileOptimized },
                ].map(({ label, ok }) => (
                  <span key={label} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: ok ? '#f2fdf5' : '#fdf2f2', color: ok ? '#1e8449' : '#c0392b', border: `1px solid ${ok ? '#a9dfbf' : '#f5c6c6'}` }}>
                    {ok ? '✓' : '✗'} {label}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: '#6b6460', lineHeight: 1.75, fontWeight: 300 }}>{websiteAnalysis}</p>
            </div>
          )}

          {/* Social section */}
          {(tiktok || instagram || youtube) && (
            <div style={{ background: 'white', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 16, padding: '32px', marginBottom: 20, animation: visible ? 'fadeUp 0.6s ease 0.3s forwards' : 'none', opacity: 0 }}>
              <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09890', marginBottom: 20, fontWeight: 400 }}>Social Media</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
                {tiktok && <StatChip label="TikTok Followers" value={tiktok.followers.toLocaleString()} />}
                {tiktok && <StatChip label="Avg Views" value={tiktok.avgViews.toLocaleString()} />}
                {instagram && <StatChip label="IG Followers" value={instagram.followers.toLocaleString()} />}
                {instagram && <StatChip label="IG Engagement" value={`${instagram.engagementRate}%`} />}
                {youtube && <StatChip label="YT Subscribers" value={youtube.subscribers.toLocaleString()} />}
              </div>
              <p style={{ fontSize: 14, color: '#6b6460', lineHeight: 1.75, fontWeight: 300 }}>{socialAnalysis}</p>
            </div>
          )}

          {/* Priority actions */}
          <div style={{ animation: visible ? 'fadeUp 0.6s ease 0.4s forwards' : 'none', opacity: 0 }}>
            <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09890', marginBottom: 16, fontWeight: 400 }}>Priority Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topIssues?.map((issue, i) => {
                const cfg = severityConfig[issue.severity] || severityConfig.quickwin
                return (
                  <div key={i} style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: cfg.color, fontWeight: 400 }}>{cfg.label}</span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 400, color: '#1c1917', marginBottom: 6 }}>{issue.title}</p>
                    <p style={{ fontSize: 14, color: '#6b6460', lineHeight: 1.7, fontWeight: 300 }}>{issue.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 48, textAlign: 'center', animation: visible ? 'fadeUp 0.6s ease 0.5s forwards' : 'none', opacity: 0 }}>
            <button onClick={() => navigate('/')}
              style={{ background: '#1c1917', color: '#f7f4ef', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 300, cursor: 'pointer', letterSpacing: '.02em', transition: 'background .2s' }}
              onMouseEnter={e => e.target.style.background = '#2a5c45'}
              onMouseLeave={e => e.target.style.background = '#1c1917'}
            >
              Run another scan
            </button>
          </div>

        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid rgba(28,25,23,0.08)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#a09890', fontWeight: 300 }}>© 2026 Scano</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Privacy Policy</button>
            <button onClick={() => navigate('/impressum')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Impressum</button>
          </div>
        </div>

      </div>
    </>
  )
}