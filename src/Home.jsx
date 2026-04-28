import { useState, useEffect, useRef } from 'react'

const C = {
  bg:          '#f7f4ef',
  bgSecond:    '#f0ece4',
  bgCard:      '#ffffff',
  text:        '#1c1917',
  textMuted:   '#6b6460',
  textLight:   '#a09890',
  border:      'rgba(28,25,23,0.09)',
  accent:      '#2a5c45',
  accentLight: 'rgba(42,92,69,0.08)',
  warm:        '#8c7355',
  red:         '#c0392b',
  redLight:    'rgba(192,57,43,0.07)',
  greenLight:  'rgba(42,92,69,0.07)',
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:none } }
  @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes scanLine { 0% { top: 0%; opacity:1; } 100% { top: 100%; opacity:0; } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

  .reveal { opacity:0; transform:translateY(20px); transition: opacity .6s cubic-bezier(.4,0,.2,1), transform .6s cubic-bezier(.4,0,.2,1); }
  .reveal.in { opacity:1; transform:none; }

  .inp {
    width:100%; background:#fff; border:1px solid rgba(28,25,23,0.12); border-radius:10px;
    padding:13px 16px 13px 44px; color:#1c1917; font-family:'Jost',sans-serif;
    font-weight:300; font-size:15px; outline:none;
    transition: border-color .2s, box-shadow .2s;
  }
  .inp::placeholder { color:#b0a89e; font-weight:300; }
  .inp:focus { border-color:rgba(42,92,69,0.4); box-shadow:0 0 0 3px rgba(42,92,69,0.08); }
  .inp:disabled { opacity:0.5; cursor:not-allowed; }

  .btn-primary {
    background:#1c1917; color:#f7f4ef; border:none; border-radius:10px;
    padding:15px 28px; font-family:'Jost',sans-serif; font-weight:500; font-size:15px;
    cursor:pointer; width:100%; letter-spacing:.03em;
    transition: background .2s, transform .15s, box-shadow .2s;
  }
  .btn-primary:hover:not(:disabled) { background:#2a5c45; transform:translateY(-2px); box-shadow:0 12px 36px rgba(42,92,69,0.22); }
  .btn-primary:active:not(:disabled) { transform:none; }
  .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }

  .btn-ghost {
    background:transparent; color:#1c1917; border:1px solid rgba(28,25,23,0.18); border-radius:10px;
    padding:14px 28px; font-family:'Jost',sans-serif; font-weight:400; font-size:15px;
    cursor:pointer; width:100%; letter-spacing:.03em;
    transition: border-color .2s, background .2s, transform .15s;
  }
  .btn-ghost:hover { border-color:rgba(28,25,23,0.35); background:rgba(28,25,23,0.03); transform:translateY(-1px); }

  .card { background:#fff; border:1px solid rgba(28,25,23,0.08); border-radius:16px; transition:box-shadow .3s,transform .3s,border-color .3s; }
  .card:hover { box-shadow:0 16px 48px rgba(28,25,23,0.09); transform:translateY(-4px); border-color:rgba(28,25,23,0.14); }

  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:#f7f4ef; }
  ::-webkit-scrollbar-thumb { background:rgba(28,25,23,0.12); border-radius:3px; }
`

function useReveal(delay = 0) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Logo({ size = 32, color = '#2a5c45' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="1.1" opacity="0.35" />
      <circle cx="16" cy="16" r="9"  stroke={color} strokeWidth="1.1" opacity="0.6" />
      <circle cx="16" cy="16" r="3.2" fill={color} />
      <line x1="16" y1="2"  x2="16" y2="7"  stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="16" y1="25" x2="16" y2="30" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="2"  y1="16" x2="7"  y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="25" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 32); window.addEventListener('scroll', fn); return () => window.removeEventListener('scroll', fn) }, [])
  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100, height:60,
      padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between',
      background: scrolled ? 'rgba(247,244,239,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(28,25,23,0.08)' : '1px solid transparent',
      transition:'all .35s ease',
    }}>
      <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
        <Logo size={24} />
        <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:500, fontSize:20, color:C.text, letterSpacing:'-.01em' }}>Scano</span>
      </div>
      <button onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' })} style={{
        background:C.text, color:C.bg, border:'none', borderRadius:8,
        padding:'8px 18px', fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:14,
        cursor:'pointer', letterSpacing:'.02em', transition:'background .2s',
      }}
        onMouseEnter={e => e.target.style.background = C.accent}
        onMouseLeave={e => e.target.style.background = C.text}
      >Scan for free</button>
    </nav>
  )
}

const SCAN_STEPS = [
  'Analyzing website performance…',
  'Checking Core Web Vitals…',
  'Scanning SEO signals…',
  'Pulling social media data…',
  'Measuring engagement rates…',
  'Running AI analysis…',
  'Generating your report…',
]

// Maps API error responses to user-facing error codes for Report.jsx ErrorScreen
function classifyError(scanRes, scanData, reportRes) {
  if (!scanRes.ok) {
    if (scanData?.error === 'unreachable') return { code: 'unreachable' }
    if (scanRes.status === 504 || scanRes.status === 524) return { code: 'timeout' }
    return { code: 'generic' }
  }
  if (!reportRes?.ok) {
    return { code: 'generic' }
  }
  if (!scanData || (!scanData.website && !scanData.content)) {
    return { code: 'no_data' }
  }
  return null
}

function Hero({ onScanComplete, onScanError }) {
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [social, setSocial] = useState({
    tiktokFollowers:'', tiktokAvgViews:'', tiktokEngagement:'',
    igFollowers:'', igAvgLikes:'', igEngagement:'',
    ytSubscribers:'', ytAvgViews:'',
    twFollowers:'',
  })
  const [activePlatforms, setActivePlatforms] = useState([])
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  // Stores the built manualSocial payload so onRetry can reuse it
  const lastScanPayload = useRef(null)

  const platforms = [
    { key:'tiktok',    icon:'🎵', label:'TikTok' },
    { key:'instagram', icon:'📸', label:'Instagram' },
    { key:'youtube',   icon:'▶️', label:'YouTube' },
    { key:'twitter',   icon:'𝕏',  label:'X / Twitter' },
  ]

  const platformFields = {
    tiktok:    [{ key:'tiktokFollowers', label:'Followers', placeholder:'e.g. 12400' }, { key:'tiktokAvgViews', label:'Avg. Views per video', placeholder:'e.g. 8500' }, { key:'tiktokEngagement', label:'Engagement rate %', placeholder:'e.g. 4.2' }],
    instagram: [{ key:'igFollowers', label:'Followers', placeholder:'e.g. 3200' }, { key:'igAvgLikes', label:'Avg. Likes per post', placeholder:'e.g. 180' }, { key:'igEngagement', label:'Engagement rate %', placeholder:'e.g. 3.1' }],
    youtube:   [{ key:'ytSubscribers', label:'Subscribers', placeholder:'e.g. 5100' }, { key:'ytAvgViews', label:'Avg. Views per video', placeholder:'e.g. 2200' }],
    twitter:   [{ key:'twFollowers', label:'Followers', placeholder:'e.g. 1800' }],
  }

  const togglePlatform = (key) => {
    setActivePlatforms(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  }

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setStepIndex(i => Math.min(i + 1, SCAN_STEPS.length - 1))
    }, 7000)
    return () => clearInterval(interval)
  }, [loading])

  const handleNext = () => {
    if (!url) { setError('Please enter your website URL.'); return }
    setError('')
    setStep(2)
  }

  const buildManualSocial = () => {
    const manualSocial = {}
    if (activePlatforms.includes('tiktok') && social.tiktokFollowers) {
      manualSocial.tiktok = {
        followers: parseInt(social.tiktokFollowers) || 0,
        avgViews: parseInt(social.tiktokAvgViews) || 0,
        engagementRate: social.tiktokEngagement || '0',
        hasLink: true, bio: '', videoCount: 0, topVideos: [],
      }
    }
    if (activePlatforms.includes('instagram') && social.igFollowers) {
      manualSocial.instagram = {
        followers: parseInt(social.igFollowers) || 0,
        avgLikes: parseInt(social.igAvgLikes) || 0,
        engagementRate: social.igEngagement || '0',
        hasLink: true, bio: '', postsCount: 0,
      }
    }
    if (activePlatforms.includes('youtube') && social.ytSubscribers) {
      manualSocial.youtube = {
        subscribers: parseInt(social.ytSubscribers) || 0,
        totalViews: parseInt(social.ytAvgViews) || 0,
        videoCount: 0,
      }
    }
    if (activePlatforms.includes('twitter') && social.twFollowers) {
      manualSocial.twitter = { followers: parseInt(social.twFollowers) || 0 }
    }
    return manualSocial
  }

  const runScan = async (websiteUrl, manualSocial) => {
    setLoading(true)
    setStepIndex(0)

    let scanRes, scanData, reportRes, reportData

    try {
      scanRes = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, manualSocial }),
      })
      scanData = await scanRes.json()
    } catch {
      // Network failure / Vercel timeout (fetch itself threw)
      setLoading(false)
      onScanError({ code: 'timeout' }, websiteUrl, () => runScan(websiteUrl, manualSocial))
      return
    }

    // Scan API returned an error
    if (!scanRes.ok) {
      setLoading(false)
      const errorCode = classifyError(scanRes, scanData, null)
      onScanError(errorCode, websiteUrl, () => runScan(websiteUrl, manualSocial))
      return
    }

    try {
      reportRes = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData, websiteUrl }),
      })
      reportData = await reportRes.json()
    } catch {
      setLoading(false)
      onScanError({ code: 'generic' }, websiteUrl, () => runScan(websiteUrl, manualSocial))
      return
    }

    if (!reportRes.ok || !reportData?.report) {
      setLoading(false)
      onScanError({ code: 'generic' }, websiteUrl, () => runScan(websiteUrl, manualSocial))
      return
    }

    // All good — hand off to App
    onScanComplete(scanData, reportData.report, websiteUrl)
  }

  const handleScan = async () => {
    setError('')
    const manualSocial = buildManualSocial()
    lastScanPayload.current = { websiteUrl: url, manualSocial }
    await runScan(url, manualSocial)
  }

  if (loading) {
    return (
      <>
        <style>{`
          @keyframes drawPath { from { stroke-dashoffset: 900; } to { stroke-dashoffset: 0; } }
          @keyframes fadeStep { from { opacity:0; transform:translateX(6px); } to { opacity:1; transform:none; } }
          @keyframes markerIn { from { opacity:0; transform:scaleY(0); } to { opacity:1; transform:scaleY(1); } }
          @keyframes endGlow { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
        `}</style>
        <section style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f4ef', padding:'0 32px' }}>
          <div style={{ width:'100%', maxWidth:560, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <svg viewBox="0 0 500 200" style={{ width:'100%', maxWidth:500, marginBottom:44, overflow:'visible' }}>
              {[50,100,150].map(y => <line key={y} x1="20" y1={y} x2="480" y2={y} stroke="rgba(28,25,23,0.035)" strokeWidth="1"/>)}
              <path d="M 30,100 C 80,100 90,45 140,45 C 190,45 190,155 240,155 C 290,155 290,60 340,60 C 390,60 400,110 460,100"
                fill="none" stroke="rgba(42,92,69,0.1)" strokeWidth="1.2"/>
              <path d="M 30,100 C 80,100 90,45 140,45 C 190,45 190,155 240,155 C 290,155 290,60 340,60 C 390,60 400,110 460,100"
                fill="none" stroke="#2a5c45" strokeWidth="1.4" strokeLinecap="round"
                strokeDasharray="900" strokeDashoffset="900"
                style={{ animation:'drawPath 50s cubic-bezier(0.4,0,0.6,1) forwards' }}/>
              {[{x:140,y:45},{x:240,y:155},{x:340,y:60}].map(({x,y},i) => (
                <g key={x} style={{ animation:`markerIn .4s ease ${2+i*3}s both`, opacity:0 }}>
                  <line x1={x} y1={y-28} x2={x} y2={y+28} stroke="rgba(42,92,69,0.2)" strokeWidth="1" strokeDasharray="2 3"/>
                  <circle cx={x} cy={y} r="2.5" fill="none" stroke="rgba(42,92,69,0.45)" strokeWidth="1"/>
                  <circle cx={x} cy={y} r="1" fill="#2a5c45" opacity="0.6"/>
                </g>
              ))}
              <circle cx="30" cy="100" r="4" fill="none" stroke="rgba(42,92,69,0.4)" strokeWidth="1.2"/>
              <circle cx="30" cy="100" r="1.8" fill="#2a5c45"/>
              <circle cx="460" cy="100" r="5" fill="none" stroke="#2a5c45" strokeWidth="1"
                style={{ animation:'endGlow 2s ease-in-out infinite' }}/>
              <circle cx="460" cy="100" r="2" fill="#2a5c45" opacity="0.5"/>
              {[{x:90,y:32,label:'Website'},{x:215,y:172,label:'Social'},{x:355,y:47,label:'AI Analysis'}].map(({x,y,label},i) => (
                <text key={label} x={x} y={y} textAnchor="middle"
                  fontFamily="Jost, sans-serif" fontSize="9" fontWeight="300"
                  fill="rgba(42,92,69,0.5)" letterSpacing="1"
                  style={{ animation:`markerIn .4s ease ${1.5+i*3}s both`, opacity:0 }}>
                  {label.toUpperCase()}
                </text>
              ))}
            </svg>
            <p style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(22px,4vw,30px)', letterSpacing:'-.02em', color:'#1c1917', marginBottom:10, textAlign:'center' }}>
              Scanning your business
            </p>
            <div style={{ height:22, overflow:'hidden', marginBottom:20 }}>
              <p key={stepIndex} style={{ fontSize:13, color:'#2a5c45', fontWeight:300, letterSpacing:'.03em', textAlign:'center', animation:'fadeStep .35s ease both' }}>
                {SCAN_STEPS[stepIndex]}
              </p>
            </div>
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {SCAN_STEPS.map((_, i) => (
                <div key={i} style={{
                  height:4, borderRadius:2,
                  width: i === stepIndex ? 20 : 5,
                  background: i < stepIndex ? '#2a5c45' : i === stepIndex ? '#2a5c45' : 'rgba(28,25,23,0.1)',
                  opacity: i < stepIndex ? 0.35 : 1,
                  transition:'all .4s cubic-bezier(0.4,0,0.2,1)',
                }}/>
              ))}
            </div>
            <p style={{ fontSize:11, color:'#a09890', marginTop:18, fontWeight:300, letterSpacing:'.04em', textTransform:'uppercase' }}>
              30 – 60 seconds
            </p>
          </div>
        </section>
      </>
    )
  }

  return (
    <section style={{ paddingTop:120, paddingBottom:96, paddingLeft:24, paddingRight:24, position:'relative' }}>
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:480,
        backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(28,25,23,0.035) 59px, rgba(28,25,23,0.035) 60px)',
        pointerEvents:'none',
        maskImage:'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 20%, rgba(0,0,0,0.25) 80%, transparent 100%)',
      }} />

      <div style={{ maxWidth:580, margin:'0 auto', position:'relative' }}>
        <div style={{ animation:'fadeUp .5s ease both', marginBottom:30, display:'flex', alignItems:'center', gap:10 }}>
          <Logo size={18} />
          <span style={{ fontSize:12, fontWeight:400, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, fontFamily:'Jost,sans-serif' }}>
            AI Business Audit
          </span>
        </div>

        <h1 style={{
          fontFamily:'Cormorant Garant, serif', fontSize:'clamp(42px, 6vw, 70px)',
          fontWeight:300, lineHeight:1.06, letterSpacing:'-.025em', color:C.text,
          marginBottom:22, animation:'fadeUp .6s .08s ease both',
        }}>
          Find out what's <em style={{ fontStyle:'italic', color:C.warm }}>actually</em><br />
          holding your business back.
        </h1>

        <p style={{
          fontSize:17, color:C.textMuted, lineHeight:1.72, marginBottom:48,
          animation:'fadeUp .6s .16s ease both', fontWeight:300, maxWidth:460,
        }}>
          Enter your website and social numbers. We analyze everything and give you a clear score with specific things to fix — in under a minute.
        </p>

        <div id="scan-form" style={{
          background:'#fff', border:'1px solid rgba(28,25,23,0.1)', borderRadius:18,
          padding:28, display:'flex', flexDirection:'column', gap:0,
          animation:'fadeUp .6s .24s ease both', boxShadow:'0 4px 32px rgba(28,25,23,0.07)',
        }}>

          {/* Step indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:24 }}>
            {[{n:1,label:'Website'},{n:2,label:'Social'}].map(({n,label}) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                  background: step >= n ? C.accent : 'transparent',
                  border: `1px solid ${step >= n ? C.accent : 'rgba(28,25,23,0.15)'}`,
                  fontSize:11, fontWeight:500, color: step >= n ? '#fff' : C.textLight,
                  transition:'all .3s ease',
                }}>{n}</div>
                <span style={{ fontSize:12, color: step >= n ? C.text : C.textLight, fontWeight:300, transition:'color .3s' }}>{label}</span>
                {n < 2 && <div style={{ width:24, height:1, background:'rgba(28,25,23,0.12)', margin:'0 4px' }}/>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🌐</span>
                <input className="inp" value={url} onChange={e => setUrl(e.target.value)}
                  placeholder="yourwebsite.com"
                  onKeyDown={e => e.key === 'Enter' && handleNext()} />
              </div>
              {error && <p style={{ fontSize:13, color:'#c0392b', fontWeight:300, padding:'8px 12px', background:'rgba(192,57,43,0.06)', borderRadius:8 }}>{error}</p>}
              <div style={{ height:4 }} />
              <button className="btn-primary" onClick={handleNext}>
                Continue → Add social numbers
              </button>
              <p style={{ fontSize:12, color:C.textLight, textAlign:'center', marginTop:2 }}>
                No account needed · Free forever
              </p>
            </div>
          )}

          {step === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <p style={{ fontSize:13, color:C.textMuted, fontWeight:300, lineHeight:1.6 }}>
                Select the platforms you're active on and enter your numbers. You can find these in your app's analytics.
              </p>

              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {platforms.map(p => (
                  <button key={p.key} onClick={() => togglePlatform(p.key)} style={{
                    background: activePlatforms.includes(p.key) ? 'rgba(42,92,69,0.08)' : 'transparent',
                    border: `1px solid ${activePlatforms.includes(p.key) ? 'rgba(42,92,69,0.35)' : 'rgba(28,25,23,0.12)'}`,
                    borderRadius:8, padding:'7px 14px', fontSize:13, cursor:'pointer',
                    fontFamily:'Jost,sans-serif', fontWeight:300,
                    color: activePlatforms.includes(p.key) ? C.accent : C.textMuted,
                    display:'flex', alignItems:'center', gap:6, transition:'all .2s',
                  }}>
                    <span>{p.icon}</span> {p.label}
                    {activePlatforms.includes(p.key) && <span style={{ fontSize:10, marginLeft:2 }}>✓</span>}
                  </button>
                ))}
              </div>

              {activePlatforms.map(pKey => (
                <div key={pKey} style={{ background:'rgba(28,25,23,0.02)', border:'1px solid rgba(28,25,23,0.07)', borderRadius:12, padding:'16px' }}>
                  <p style={{ fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, marginBottom:12, fontWeight:400 }}>
                    {platforms.find(p=>p.key===pKey)?.icon} {platforms.find(p=>p.key===pKey)?.label}
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:8 }}>
                    {platformFields[pKey].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize:11, color:C.textLight, fontWeight:300, display:'block', marginBottom:5 }}>{f.label}</label>
                        <input className="inp" style={{ paddingLeft:12 }} value={social[f.key]}
                          onChange={e => setSocial(s=>({...s,[f.key]:e.target.value}))}
                          placeholder={f.placeholder} type="text" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {activePlatforms.length === 0 && (
                <p style={{ fontSize:13, color:C.textLight, fontWeight:300, textAlign:'center', padding:'8px 0', fontStyle:'italic' }}>
                  No social media? No problem — we'll analyze your website only.
                </p>
              )}

              {error && <p style={{ fontSize:13, color:'#c0392b', fontWeight:300, padding:'8px 12px', background:'rgba(192,57,43,0.06)', borderRadius:8 }}>{error}</p>}

              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button onClick={() => setStep(1)} style={{
                  background:'none', border:'1px solid rgba(28,25,23,0.12)', borderRadius:10,
                  padding:'14px 20px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:300,
                  cursor:'pointer', color:C.textMuted, transition:'all .2s', flexShrink:0,
                }}>← Back</button>
                <button className="btn-primary" onClick={handleScan} style={{ flex:1 }}>
                  Scan my business — it's free
                </button>
              </div>
              <p style={{ fontSize:12, color:C.textLight, textAlign:'center' }}>
                No account needed · Only fill in what you have
              </p>
            </div>
          )}

        </div>
      </div>
    </section>
  )
}

function WhatWeCheck() {
  const [ref, visible] = useReveal()
  const items = [
    { icon:'🌐', title:'Your website', desc:'We check load speed, whether visitors instantly understand what you offer, whether your call-to-action is clear, and whether the design builds trust.' },
    { icon:'📱', title:'Your social content', desc:'We look at your TikTok, Instagram, YouTube, X, and Facebook — engagement rates, posting consistency, and what your best performing content has in common.' },
    { icon:'📋', title:'A clear action list', desc:'You get a score from 0–100 for each area, plus a prioritized list of the most important things to fix — written in plain, simple language.' },
  ]

  return (
    <section style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible ? 'in' : ''}`} style={{ marginBottom:60 }}>
          <p style={{ fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>What we check</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>
            Every part of your online presence,<br />in one report.
          </h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:2 }}>
          {items.map((item, i) => {
            const [cardRef, cardVisible] = useReveal(i * 80)
            return (
              <div key={i} ref={cardRef} style={{
                padding:'40px 36px', background:'#fff',
                border:'1px solid rgba(28,25,23,0.07)',
                borderRadius: i===0 ? '14px 0 0 14px' : i===items.length-1 ? '0 14px 14px 0' : '0',
                opacity: cardVisible ? 1 : 0, transform: cardVisible ? 'none' : 'translateY(16px)',
                transition:`all .55s ease ${i*.1}s`,
              }}>
                <div style={{ fontSize:28, marginBottom:20 }}>{item.icon}</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:24, letterSpacing:'-.015em', marginBottom:14, color:C.text }}>{item.title}</h3>
                <p style={{ color:C.textMuted, lineHeight:1.75, fontSize:15, fontWeight:300 }}>{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ScoreBar({ label, score, color, delay, visible }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7, fontSize:13 }}>
        <span style={{ color:C.textMuted, fontWeight:300 }}>{label}</span>
        <span style={{ color:C.text, fontFamily:'DM Mono, monospace', fontSize:12 }}>{score}/100</span>
      </div>
      <div style={{ height:4, background:'rgba(28,25,23,0.07)', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:4, background:color, width: visible ? `${score}%` : '0%', transition:`width 1.1s cubic-bezier(.4,0,.2,1) ${delay}s` }} />
      </div>
    </div>
  )
}

function SampleReport() {
  const [ref, visible] = useReveal()
  const bars = [
    { label:'Website & UX',    score:71, color:'#2a5c45' },
    { label:'TikTok content',  score:43, color:'#c0392b' },
    { label:'Instagram',       score:62, color:'#b7860b' },
    { label:'Brand clarity',   score:58, color:'#8c7355' },
  ]
  const actions = [
    { bad:true,  text:"Your hero headline \"Premium Online Coaching\" describes the product, not the result. Visitors decide in 5 seconds. Rewrite it to answer: what does the customer's life look like after buying?" },
    { bad:true,  text:'Your TikTok engagement rate is 1.8% — the fitness average is 4.8%. Your hooks are likely too slow. Your top-performing video had 3x the average views — analyze what made it different.' },
    { bad:false, text:'SEO foundation is solid: meta title and description are good length, H1 is present. Canonical tag is missing — add it to avoid duplicate content penalties.' },
    { bad:true,  text:'No social proof visible above the fold. One real testimonial with a specific result ("Lost 12kg in 8 weeks") converts better than any design change.' },
  ]

  return (
    <section style={{ padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible ? 'in' : ''}`} style={{ marginBottom:60 }}>
          <p style={{ fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>Sample output</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>This is what your report looks like.</h2>
          <p style={{ color:C.textMuted, marginTop:12, fontSize:16, fontWeight:300 }}>Real data. Industry benchmarks. Specific fixes. No generic advice.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:20 }}>
          <div className="card" style={{ padding:36 }}>
            <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, marginBottom:20, fontWeight:400 }}>Overall score</p>
            <div style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:100, lineHeight:1, letterSpacing:'-.04em', color:C.text, marginBottom:2, opacity:visible?1:0, transform:visible?'none':'scale(.85)', transition:'all .7s .3s ease' }}>
              59
            </div>
            <p style={{ color:C.textLight, fontSize:13, marginBottom:36, fontWeight:300 }}>out of 100</p>
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {bars.map((b, i) => <ScoreBar key={i} {...b} delay={.4 + i*.12} visible={visible} />)}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, marginBottom:6, fontWeight:400 }}>Priority action list</p>
            {actions.map((a, i) => (
              <div key={i} style={{
                background: a.bad ? C.redLight : C.greenLight,
                border:`1px solid ${a.bad ? 'rgba(192,57,43,0.14)' : 'rgba(42,92,69,0.14)'}`,
                borderRadius:12, padding:'16px 18px', display:'flex', gap:12,
                opacity:visible?1:0, transform:visible?'none':'translateX(16px)',
                transition:`all .5s ease ${.4+i*.1}s`,
              }}>
                <span style={{ fontSize:14, flexShrink:0, marginTop:2 }}>{a.bad ? '⚠' : '✓'}</span>
                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.68, fontWeight:300 }}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const [ref, visible] = useReveal()
  const plans = [
    {
      name:'Free', price:'€0', note:'no account required',
      desc:'See where you stand.',
      features:['Overall score from 0–100','Full website analysis (performance, SEO, accessibility)','Social media stats & engagement rates','Your 2 most critical issues to fix','No account needed'],
      cta:'Start for free', featured:false,
    },
    {
      name:'Full Report', price:'€9', note:'one-time · no subscription',
      desc:'Everything you need to actually improve.',
      features:['Everything in the free scan','All 5 priority actions with exact fixes','Automatic social media data pull','Competitor comparison scan','Score history — track your progress','Priority email support'],
      cta:'Get full report', featured:true,
    },
  ]

  return (
    <section style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible ? 'in' : ''}`} style={{ marginBottom:60 }}>
          <p style={{ fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>Pricing</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 4vw, 52px)', letterSpacing:'-.02em' }}>Simple. No surprises.</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16 }}>
          {plans.map((p, i) => (
            <div key={i} style={{
              background:'#fff', border:`1px solid ${p.featured ? 'rgba(42,92,69,0.3)' : 'rgba(28,25,23,0.08)'}`,
              borderRadius:18, padding:36, position:'relative',
              opacity:visible?1:0, transform:visible?'none':'translateY(20px)',
              transition:`all .55s ease ${i*.12}s`,
              boxShadow:p.featured ? '0 8px 40px rgba(42,92,69,0.1)' : 'none',
            }}>
              {p.featured && <div style={{ position:'absolute', top:20, right:20, background:C.accent, color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:500, letterSpacing:'.05em' }}>Best value</div>}
              <p style={{ fontFamily:'Jost,sans-serif', fontWeight:500, fontSize:16, marginBottom:6, color:C.text }}>{p.name}</p>
              <p style={{ color:C.textLight, fontSize:13, fontWeight:300, marginBottom:22 }}>{p.desc}</p>
              <div style={{ marginBottom:4 }}>
                <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:54, letterSpacing:'-.03em', color:C.text }}>{p.price}</span>
              </div>
              <p style={{ color:C.textLight, fontSize:12, marginBottom:28, fontWeight:300 }}>{p.note}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:11, marginBottom:32 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:14 }}>
                    <span style={{ color:p.featured ? C.accent : C.textLight, flexShrink:0, marginTop:1 }}>✓</span>
                    <span style={{ color:C.textMuted, fontWeight:300 }}>{f}</span>
                  </div>
                ))}
              </div>
              <button className={p.featured ? 'btn-primary' : 'btn-ghost'}
                onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' })}
              >{p.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [ref, visible] = useReveal()
  const [open, setOpen] = useState(null)
  const items = [
    { q:'Do I need an account?', a:'No. You can scan your business and see your score without creating an account. You only need one if you want to save and revisit your full report later.' },
    { q:'Which platforms does Scano support?', a:'You can enter your website, TikTok, Instagram, YouTube, X (Twitter), and Facebook. You don\'t need all of them — just add what you have.' },
    { q:'How accurate is the analysis?', a:'Scano uses real data from your profiles: actual engagement rates, posting frequency, and content structure. The AI interprets this data and identifies patterns. It\'s not perfect, but it\'s based on what actually works — not generic advice.' },
    { q:'Free vs. full report — what\'s the difference?', a:'The free scan gives you your full score, website analysis, social media stats, and your 2 most critical issues. The full report (€9, one-time) unlocks all 5 priority actions with exact fixes, hook-by-hook content analysis, engagement benchmarks, and brand clarity feedback.' },
    { q:'Is my data safe?', a:'Yes. Your URLs and handles are only used to run the scan. We don\'t sell or share your data with anyone. Read more in our Privacy Policy.' },
  ]

  return (
    <section style={{ padding:'96px 24px' }}>
      <div style={{ maxWidth:680, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible ? 'in' : ''}`} style={{ marginBottom:48 }}>
          <p style={{ fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>FAQ</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 4vw, 48px)', letterSpacing:'-.02em' }}>Questions you might have.</h2>
        </div>
        <div style={{ display:'flex', flexDirection:'column' }}>
          {items.map((item, i) => (
            <div key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
              <button onClick={() => setOpen(open===i ? null : i)} style={{
                width:'100%', background:'none', border:'none', cursor:'pointer',
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'20px 0', textAlign:'left',
              }}>
                <span style={{ fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:15, color:C.text }}>{item.q}</span>
                <span style={{ color:C.textLight, fontSize:20, lineHeight:1, marginLeft:16, flexShrink:0, transition:'transform .25s', transform:open===i ? 'rotate(45deg)' : 'none', display:'block' }}>+</span>
              </button>
              <div style={{ maxHeight:open===i ? 200 : 0, overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1)' }}>
                <p style={{ color:C.textMuted, fontSize:14.5, lineHeight:1.75, fontWeight:300, paddingBottom:20 }}>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  const [ref, visible] = useReveal()
  return (
    <section style={{ background:C.text, padding:'96px 24px' }}>
      <div ref={ref} style={{ maxWidth:520, margin:'0 auto', textAlign:'center', opacity:visible?1:0, transform:visible?'none':'translateY(20px)', transition:'all .65s ease' }}>
        <div style={{ marginBottom:28, animation:visible ? 'float 4s ease-in-out infinite' : 'none', display:'inline-block' }}>
          <Logo size={38} color="#f0ece4" />
        </div>
        <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, color:C.bg, fontSize:'clamp(32px, 4vw, 52px)', letterSpacing:'-.025em', lineHeight:1.1, marginBottom:18 }}>
          Your score is one scan away.
        </h2>
        <p style={{ color:'rgba(247,244,239,0.5)', fontSize:16, marginBottom:40, lineHeight:1.7, fontWeight:300 }}>
          Find out in under a minute what's holding your business back — and exactly how to fix it.
        </p>
        <button onClick={() => window.scrollTo({ top:0, behavior:'smooth' })} style={{
          background:C.bg, color:C.text, border:'none', borderRadius:10,
          padding:'15px 32px', fontFamily:'Jost,sans-serif', fontWeight:500,
          fontSize:15, cursor:'pointer', letterSpacing:'.02em',
          transition:'background .2s, transform .15s', display:'inline-block',
        }}
          onMouseEnter={e => e.target.style.background = '#ede8e0'}
          onMouseLeave={e => e.target.style.background = C.bg}
        >
          Scan my business — it's free
        </button>
        <p style={{ marginTop:16, fontSize:12, color:'rgba(247,244,239,0.28)', fontWeight:300 }}>No account · No credit card · Instant results</p>
      </div>
    </section>
  )
}

function Footer({ navigate }) {
  return (
    <footer style={{ borderTop:`1px solid ${C.border}`, padding:'28px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16, background:C.bg }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Logo size={20} />
        <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:16, color:C.text }}>Scano</span>
      </div>
      <p style={{ fontSize:13, color:C.textLight, fontWeight:300 }}>© 2026 Scano</p>
      <div style={{ display:'flex', gap:24 }}>
        {[{ label:'Privacy Policy', path:'/privacy' }, { label:'Impressum', path:'/impressum' }].map(l => (
          <button key={l.label} onClick={() => navigate(l.path)} style={{
            background:'none', border:'none', cursor:'pointer', fontSize:13,
            color:C.textLight, fontFamily:'Jost,sans-serif', fontWeight:300, transition:'color .2s',
          }}
            onMouseEnter={e => e.target.style.color = C.textMuted}
            onMouseLeave={e => e.target.style.color = C.textLight}
          >{l.label}</button>
        ))}
      </div>
    </footer>
  )
}

export default function Home({ navigate, onScanComplete, onScanError }) {
  return (
    <>
      <style>{CSS}</style>
      <Nav navigate={navigate} />
      <Hero onScanComplete={onScanComplete} onScanError={onScanError} />
      <WhatWeCheck />
      <SampleReport />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer navigate={navigate} />
    </>
  )
}