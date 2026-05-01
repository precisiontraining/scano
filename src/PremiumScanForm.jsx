import { useState } from 'react'

const C = {
  bg: '#f7f4ef', bgCard: '#ffffff', text: '#1c1917', muted: '#6b6460',
  light: '#a09890', border: 'rgba(28,25,23,0.09)', accent: '#2a5c45', warm: '#8c7355',
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .pinp {
    width:100%; background:#fff; border:1px solid rgba(28,25,23,0.12); border-radius:10px;
    padding:11px 14px 11px 42px; color:#1c1917; font-family:'Jost',sans-serif;
    font-weight:300; font-size:14px; outline:none; transition: border-color .2s, box-shadow .2s;
  }
  .pinp:focus { border-color:rgba(42,92,69,0.4); box-shadow:0 0 0 3px rgba(42,92,69,0.08); }
  .pinp::placeholder { color:#b0a89e; }
  @media (max-width:600px) { .premium-grid { grid-template-columns: 1fr !important; } .pform-pad { padding: 24px 16px !important; } }
`

function Logo({ size = 24, color = '#2a5c45' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="1.1" opacity="0.35"/>
      <circle cx="16" cy="16" r="9" stroke={color} strokeWidth="1.1" opacity="0.6"/>
      <circle cx="16" cy="16" r="3.2" fill={color}/>
      <line x1="16" y1="2" x2="16" y2="7" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
      <line x1="16" y1="25" x2="16" y2="30" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
      <line x1="2" y1="16" x2="7" y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
      <line x1="25" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
    </svg>
  )
}

const platforms = [
  { key: 'tiktok',    icon: '🎵', label: 'TikTok',     placeholder: '@yourusername or tiktok.com/@you' },
  { key: 'instagram', icon: '📸', label: 'Instagram',  placeholder: '@yourusername or instagram.com/you' },
  { key: 'youtube',   icon: '▶️', label: 'YouTube',    placeholder: '@yourchannel or youtube.com/@you' },
  { key: 'twitter',   icon: '𝕏',  label: 'X/Twitter',  placeholder: '@yourusername or x.com/you' },
]

export default function PremiumScanForm({ navigate, onScanStart }) {
  const [url, setUrl]           = useState('')
  const [handles, setHandles]   = useState({ tiktok: '', instagram: '', youtube: '', twitter: '' })
  const [active, setActive]     = useState([])
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggle = (key) => setActive(a => a.includes(key) ? a.filter(k => k !== key) : [...a, key])

  const isValidHandle = (raw) => {
    if (!raw?.trim()) return true
    const cleaned = raw.trim()
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?(tiktok|instagram|twitter|x|youtube)\.com\/?(@)?/, '')
      .split('/')[0].split('?')[0].trim()
    return cleaned.length >= 2 && !/\s/.test(cleaned)
  }

  const handleSubmit = () => {
    if (!url.trim()) { setError('Please enter your website URL.'); return }
    const invalidPlatform = active.find(k => handles[k]?.trim() && !isValidHandle(handles[k]))
    if (invalidPlatform) {
      const label = platforms.find(p => p.key === invalidPlatform)?.label || invalidPlatform
      setError(`"${handles[invalidPlatform].trim()}" doesn't look like a valid ${label} handle. Try @yourusername.`)
      return
    }
    setError('')
    setSubmitting(true)
    const cleanHandles = {}
    active.forEach(k => { if (handles[k]?.trim()) cleanHandles[k] = handles[k].trim() })
    onScanStart({ url: url.trim(), handles: cleanHandles })
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg }}>
        {/* Nav */}
        <nav style={{ borderBottom: `1px solid ${C.border}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={22}/>
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</span>
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.light, fontFamily: 'Jost, sans-serif' }}>← Back to home</button>
        </nav>

        <div style={{ maxWidth: 640, margin: '0 auto', padding: '64px 24px 96px' }} className="pform-pad">
          {/* Header */}
          <div style={{ marginBottom: 48, animation: 'fadeUp .5s ease both' }}>
            <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 500 }}>Full Business Audit</p>
            <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(36px,5vw,56px)', letterSpacing: '-.025em', lineHeight: 1.08, marginBottom: 16 }}>
              Your complete audit.<br/><em style={{ fontStyle: 'italic', color: C.warm }}>Automatically.</em>
            </h1>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.72, fontWeight: 300 }}>
              Enter your website and social handles. We pull all data automatically — no manual numbers needed. You get the full report with exact fixes, hook analysis, and a copy rewrite.
            </p>
          </div>

          {/* What's included */}
          <div style={{ background: 'rgba(42,92,69,0.04)', border: '1px solid rgba(42,92,69,0.15)', borderRadius: 14, padding: '20px 24px', marginBottom: 36, animation: 'fadeUp .5s .08s ease both' }}>
            <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 14 }}>What's included</p>
            <div className="premium-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              {[
                'All 5 priority actions with exact fixes',
                'Automatic social data pull (no manual entry)',
                'Hook analysis — post by post',
                'Caption rewrite for your worst post',
                'Website copy rewrite with better headline',
                'Brand clarity score',
                'Effort plan: what to fix today, this week, this month',
                'Competitor comparison scan (coming soon)',
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: C.accent, fontSize: 12, marginTop: 2, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: C.muted, fontWeight: 300, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ background: '#fff', border: '1px solid rgba(28,25,23,0.1)', borderRadius: 18, padding: 32, boxShadow: '0 4px 32px rgba(28,25,23,0.07)', animation: 'fadeUp .5s .16s ease both' }}>

            {/* Website URL */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.light, fontWeight: 500, display: 'block', marginBottom: 10 }}>Your website</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🌐</span>
                <input className="pinp" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="yourwebsite.com" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
            </div>

            {/* Social platforms */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.light, fontWeight: 500, display: 'block', marginBottom: 10 }}>
                Social media <span style={{ fontSize: 10, textTransform: 'none', letterSpacing: 0, color: C.light, fontWeight: 300 }}>(optional — select what you have)</span>
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {platforms.map(p => (
                  <button key={p.key} onClick={() => toggle(p.key)} style={{
                    background: active.includes(p.key) ? 'rgba(42,92,69,0.08)' : 'transparent',
                    border: `1px solid ${active.includes(p.key) ? 'rgba(42,92,69,0.35)' : 'rgba(28,25,23,0.12)'}`,
                    borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                    fontFamily: 'Jost,sans-serif', fontWeight: 300,
                    color: active.includes(p.key) ? C.accent : C.muted,
                    display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
                  }}>
                    {p.icon} {p.label} {active.includes(p.key) && <span style={{ fontSize: 10 }}>✓</span>}
                  </button>
                ))}
              </div>
              {active.map(key => {
                const p = platforms.find(x => x.key === key)
                return (
                  <div key={key} style={{ marginBottom: 10 }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>{p.icon}</span>
                      <input className="pinp" value={handles[key]}
                        onChange={e => setHandles(h => ({ ...h, [key]: e.target.value }))}
                        placeholder={p.placeholder} />
                    </div>
                  </div>
                )
              })}
              {active.length === 0 && (
                <p style={{ fontSize: 12, color: C.light, fontStyle: 'italic', fontWeight: 300 }}>
                  No social media yet? No problem — we'll do a full website audit.
                </p>
              )}
            </div>

            {error && <p style={{ fontSize: 13, color: '#c0392b', marginBottom: 16, padding: '8px 12px', background: 'rgba(192,57,43,0.06)', borderRadius: 8 }}>{error}</p>}

            <button onClick={handleSubmit} disabled={submitting} style={{
              width: '100%', background: submitting ? C.accent : C.text, color: C.bg, border: 'none', borderRadius: 10,
              padding: '15px 28px', fontSize: 15, fontFamily: 'Jost, sans-serif', fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '.03em',
              transition: 'background .2s, transform .15s', opacity: submitting ? 0.85 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = C.accent }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = C.text }}
            >
              {submitting ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(247,244,239,0.35)', borderTopColor: '#f7f4ef', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                  Starting audit…
                </>
              ) : 'Run full audit — €9'}
            </button>
            <p style={{ fontSize: 12, color: C.light, textAlign: 'center', marginTop: 10, fontWeight: 300 }}>
              One-time · No subscription · Results in ~60 seconds
            </p>
          </div>
        </div>
      </div>
    </>
  )
}