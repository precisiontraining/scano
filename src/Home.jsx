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
  yellow:      '#d68910',
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

  @keyframes fadeUp  { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:none } }
  @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
  @keyframes agentPing { 0% { transform:scale(1); opacity:0.6; } 100% { transform:scale(2.2); opacity:0; } }

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

  .btn-accent {
    background:#2a5c45; color:#fff; border:none; border-radius:10px;
    padding:14px 28px; font-family:'Jost',sans-serif; font-weight:500; font-size:15px;
    cursor:pointer; width:100%; letter-spacing:.03em;
    transition: background .2s, transform .15s, box-shadow .2s;
  }
  .btn-accent:hover:not(:disabled) { background:#1e4433; transform:translateY(-2px); box-shadow:0 12px 36px rgba(42,92,69,0.28); }

  .social-accordion-toggle {
    width:100%; background:none; border:1px dashed rgba(28,25,23,0.18); border-radius:10px;
    padding:11px 16px; font-family:'Jost',sans-serif; font-weight:300; font-size:13px;
    color:#6b6460; cursor:pointer; display:flex; align-items:center; justify-content:space-between;
    transition: border-color .2s, background .2s;
  }
  .social-accordion-toggle:hover { border-color:rgba(42,92,69,0.35); background:rgba(42,92,69,0.03); color:#2a5c45; }

  .product-pill {
    font-size:12px; border-radius:20px; padding:6px 14px; font-weight:400;
    cursor:pointer; border:1px solid transparent;
    transition: all .2s ease; font-family:'Jost',sans-serif;
    display:inline-flex; align-items:center; gap:5px;
  }
  .product-pill:hover { transform: translateY(-1px); }

  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-track { background:#f7f4ef; }
  ::-webkit-scrollbar-thumb { background:rgba(28,25,23,0.12); border-radius:3px; }

  @media (max-width: 640px) {
    .nav-ctas { gap: 6px !important; }
    .nav-cta-ghost { display: none !important; }
    .nav-agent-link { display: none !important; }
    .hero-pad { padding-top: 96px !important; padding-bottom: 64px !important; }
    .scan-form { padding: 20px !important; }
    .section-pad { padding: 64px 20px !important; }
    .sample-grid { grid-template-columns: 1fr !important; }
    .pricing-grid { grid-template-columns: 1fr !important; }
    .what-grid { grid-template-columns: 1fr !important; gap: 2px !important; }
    .what-card:first-child { border-radius: 14px 14px 0 0 !important; }
    .what-card:last-child  { border-radius: 0 0 14px 14px !important; }
    .what-card { border-radius: 0 !important; }
    .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .chips-row { flex-wrap: wrap !important; }
    .tab-row { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .agent-flow { flex-direction: column !important; }
    .agent-flow-arrow { transform: rotate(90deg) !important; }
    .agent-bottom-grid { grid-template-columns: 1fr !important; }
  }

  @media (max-width: 900px) {
    .agent-bottom-grid { grid-template-columns: 1fr !important; }
    .dash-preview-grid { grid-template-columns: 1fr !important; }
    .dash-preview-grid > div:first-child { border-right: none !important; border-bottom: 1px solid rgba(28,25,23,0.09) !important; }
  }
`

function useReveal(delay = 0) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); obs.disconnect() } }, { threshold: 0.08 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ─── Live countdown to next Monday 9:00 AM ────────────────────────────────────
function useNextMondayCountdown() {
  const calc = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(9, 0, 0, 0)
    const day = now.getDay()
    let daysToAdd = (1 - day + 7) % 7
    if (daysToAdd === 0 && now >= next) daysToAdd = 7
    next.setDate(next.getDate() + daysToAdd)

    const diff = next - now
    const totalWeekMs = 7 * 24 * 60 * 60 * 1000
    const d = Math.floor(diff / (1000 * 60 * 60 * 24))
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const elapsed = totalWeekMs - diff
    const pct = Math.max(1, Math.min(99, Math.round((elapsed / totalWeekMs) * 100)))
    return { label: `${d}d ${h}h ${m}m`, pct }
  }

  const [state, setState] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setState(calc()), 60_000)
    return () => clearInterval(id)
  }, [])
  return state
}

function Logo({ size = 32, color = '#2a5c45' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
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

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ navigate }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 32); window.addEventListener('scroll', fn); return () => window.removeEventListener('scroll', fn) }, [])
  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100, height:60,
      padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
      background: scrolled ? 'rgba(247,244,239,0.93)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(28,25,23,0.08)' : '1px solid transparent',
      transition:'all .35s ease',
    }}>
      <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer' }}>
        <Logo size={24} />
        <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:500, fontSize:20, color:C.text, letterSpacing:'-.01em' }}>Velyr</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:20 }}>
        <button className="nav-agent-link" onClick={() => document.getElementById('pricing-section')?.scrollIntoView({ behavior:'smooth' })}
          style={{ background:'transparent', border:'1px solid rgba(42,92,69,0.35)', borderRadius:8, cursor:'pointer', fontSize:13, color:C.accent, fontFamily:'Jost,sans-serif', fontWeight:400, letterSpacing:'.01em', padding:'7px 14px', transition:'all .2s', display:'flex', alignItems:'center', gap:6 }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(42,92,69,0.08)'; e.currentTarget.style.borderColor='rgba(42,92,69,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(42,92,69,0.35)' }}
        >
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e', display:'inline-block' }} />
          Growth Agent
        </button>
        <button className="nav-agent-link" onClick={() => navigate('/agent/login')}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:C.textLight, fontFamily:'Jost,sans-serif', fontWeight:300, letterSpacing:'.01em', transition:'color .2s' }}
          onMouseEnter={e => e.currentTarget.style.color=C.textMuted}
          onMouseLeave={e => e.currentTarget.style.color=C.textLight}
        >Log in</button>
        <div className="nav-ctas" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="nav-cta-ghost" onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' })} style={{
            background:'transparent', color:C.text, border:'1px solid rgba(28,25,23,0.15)', borderRadius:8,
            padding:'7px 16px', fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:13,
            cursor:'pointer', transition:'all .2s',
          }}
            onMouseEnter={e => { e.target.style.borderColor='rgba(28,25,23,0.3)'; e.target.style.background='rgba(28,25,23,0.04)' }}
            onMouseLeave={e => { e.target.style.borderColor='rgba(28,25,23,0.15)'; e.target.style.background='transparent' }}
          >Free scan</button>
          <button onClick={() => navigate('/premium')}
            style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontFamily:'Jost,sans-serif', fontWeight:500, fontSize:13, cursor:'pointer', transition:'background .2s', letterSpacing:'.01em' }}
            onMouseEnter={e => e.target.style.background='#1e4433'}
            onMouseLeave={e => e.target.style.background=C.accent}
          >Full report</button>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onScanStart, navigate }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [socialOpen, setSocialOpen] = useState(false)
  const [social, setSocial] = useState({ tiktokFollowers:'', tiktokAvgViews:'', tiktokEngagement:'', igFollowers:'', igAvgLikes:'', igEngagement:'', ytSubscribers:'', ytAvgViews:'', twFollowers:'' })
  const [activePlatforms, setActivePlatforms] = useState([])
  const urlInputRef = useRef(null)

  useEffect(() => {
    if (urlInputRef.current) urlInputRef.current.focus()
  }, [])

  const platforms = [
    { key:'tiktok',    icon:'🎵', label:'TikTok' },
    { key:'instagram', icon:'📸', label:'Instagram' },
    { key:'youtube',   icon:'▶️', label:'YouTube' },
    { key:'twitter',   icon:'𝕏',  label:'X / Twitter' },
  ]

  const platformFields = {
    tiktok:    [{ key:'tiktokFollowers', label:'Followers', placeholder:'e.g. 12400' }, { key:'tiktokAvgViews', label:'Avg. Views', placeholder:'e.g. 8500' }, { key:'tiktokEngagement', label:'Engagement %', placeholder:'e.g. 4.2' }],
    instagram: [{ key:'igFollowers', label:'Followers', placeholder:'e.g. 3200' }, { key:'igAvgLikes', label:'Avg. Likes', placeholder:'e.g. 180' }, { key:'igEngagement', label:'Engagement %', placeholder:'e.g. 3.1' }],
    youtube:   [{ key:'ytSubscribers', label:'Subscribers', placeholder:'e.g. 5100' }, { key:'ytAvgViews', label:'Avg. Views', placeholder:'e.g. 2200' }],
    twitter:   [{ key:'twFollowers', label:'Followers', placeholder:'e.g. 1800' }],
  }

  const togglePlatform = (key) => setActivePlatforms(p => p.includes(key) ? p.filter(k=>k!==key) : [...p, key])

  const normalizeUrl = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    return `https://${trimmed}`
  }

  const buildManualSocial = () => {
    const m = {}
    if (activePlatforms.includes('tiktok') && social.tiktokFollowers)
      m.tiktok = { followers:parseInt(social.tiktokFollowers)||0, avgViews:parseInt(social.tiktokAvgViews)||0, engagementRate:social.tiktokEngagement||'0', hasLink:true, bio:'', videoCount:0, topVideos:[] }
    if (activePlatforms.includes('instagram') && social.igFollowers)
      m.instagram = { followers:parseInt(social.igFollowers)||0, avgLikes:parseInt(social.igAvgLikes)||0, engagementRate:social.igEngagement||'0', hasLink:true, bio:'', postsCount:0 }
    if (activePlatforms.includes('youtube') && social.ytSubscribers)
      m.youtube = { subscribers:parseInt(social.ytSubscribers)||0, totalViews:parseInt(social.ytAvgViews)||0, videoCount:0 }
    if (activePlatforms.includes('twitter') && social.twFollowers)
      m.twitter = { followers:parseInt(social.twFollowers)||0 }
    return m
  }

  const handleScan = () => {
    if (!url.trim()) { setError('Please enter your website URL.'); return }
    setError('')
    onScanStart({ url: normalizeUrl(url), manualSocial: buildManualSocial() })
  }

  return (
    <section className="hero-pad" style={{ paddingTop:120, paddingBottom:96, paddingLeft:24, paddingRight:24, position:'relative' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:500, backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(28,25,23,0.033) 59px, rgba(28,25,23,0.033) 60px)', pointerEvents:'none', maskImage:'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0.22) 82%, transparent 100%)' }} />
      <div style={{ maxWidth:580, margin:'0 auto', position:'relative' }}>
        <div style={{ animation:'fadeUp .5s ease both', marginBottom:28, display:'flex', alignItems:'center', gap:10 }}>
          <Logo size={16} />
          <span style={{ fontSize:11, fontWeight:400, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent }}>AI Business Audit & Growth Agent</span>
        </div>

        <h1 style={{ fontFamily:'Cormorant Garant, serif', fontSize:'clamp(40px, 7vw, 70px)', fontWeight:300, lineHeight:1.06, letterSpacing:'-.025em', color:C.text, marginBottom:14, animation:'fadeUp .6s .08s ease both' }}>
          Find out what's <em style={{ fontStyle:'italic', color:C.warm }}>actually</em><br />holding your business back.
        </h1>

        <p style={{ fontSize:15, color:C.textMuted, lineHeight:1.55, marginBottom:28, animation:'fadeUp .6s .14s ease both', fontWeight:300 }}>
          Your website score, benchmark comparisons, and the 2 biggest issues holding you back — in 60 seconds.
        </p>

        <div id="scan-form" className="scan-form" style={{ background:'#fff', border:'1px solid rgba(28,25,23,0.1)', borderRadius:18, padding:28, animation:'fadeUp .6s .2s ease both', boxShadow:'0 4px 32px rgba(28,25,23,0.07)' }}>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <p style={{ fontSize:13, fontWeight:500, color:C.text }}>Scan your business</p>
            <span style={{ fontSize:11, color:C.textLight, fontWeight:300, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:10 }}>🔒</span> Free · No account
            </span>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ position:'relative' }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🌐</span>
              <input
                ref={urlInputRef}
                className="inp"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="yourbusiness.com"
                onKeyDown={e => e.key==='Enter' && handleScan()}
                autoFocus
              />
            </div>

            {error && <p style={{ fontSize:13, color:'#c0392b', padding:'8px 12px', background:'rgba(192,57,43,0.06)', borderRadius:8 }}>{error}</p>}

            {/* Social accordion */}
            <button className="social-accordion-toggle" onClick={() => setSocialOpen(o => !o)}>
              <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ fontSize:14 }}>📱</span>
                Also analyse your social media <span style={{ fontSize:11, color:C.textLight, marginLeft:2 }}>(optional — improves the report)</span>
              </span>
              <span style={{ fontSize:14, color:C.textLight, transition:'transform .25s', transform:socialOpen?'rotate(180deg)':'none', display:'block' }}>↓</span>
            </button>

            <div style={{ maxHeight:socialOpen?800:0, overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1)' }}>
              <div style={{ paddingTop:8, display:'flex', flexDirection:'column', gap:12 }}>
                <div className="chips-row" style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {platforms.map(p => (
                    <button key={p.key} onClick={() => togglePlatform(p.key)} style={{ background:activePlatforms.includes(p.key)?'rgba(42,92,69,0.08)':'transparent', border:`1px solid ${activePlatforms.includes(p.key)?'rgba(42,92,69,0.35)':'rgba(28,25,23,0.12)'}`, borderRadius:8, padding:'7px 13px', fontSize:13, cursor:'pointer', fontFamily:'Jost,sans-serif', fontWeight:300, color:activePlatforms.includes(p.key)?C.accent:C.textMuted, display:'flex', alignItems:'center', gap:5, transition:'all .2s' }}>
                      {p.icon} {p.label} {activePlatforms.includes(p.key) && <span style={{ fontSize:10 }}>✓</span>}
                    </button>
                  ))}
                </div>
                {activePlatforms.map(pKey => (
                  <div key={pKey} style={{ background:'rgba(28,25,23,0.02)', border:'1px solid rgba(28,25,23,0.07)', borderRadius:12, padding:14 }}>
                    <p style={{ fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, marginBottom:10, fontWeight:400 }}>{platforms.find(p=>p.key===pKey)?.icon} {platforms.find(p=>p.key===pKey)?.label}</p>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:8 }}>
                      {platformFields[pKey].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize:11, color:C.textLight, fontWeight:300, display:'block', marginBottom:4 }}>{f.label}</label>
                          <input className="inp" style={{ paddingLeft:12 }} value={social[f.key]} onChange={e => setSocial(s=>({...s,[f.key]:e.target.value}))} placeholder={f.placeholder} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {activePlatforms.length===0 && <p style={{ fontSize:13, color:C.textLight, fontStyle:'italic', textAlign:'center', padding:'4px 0 8px' }}>Select the platforms you're active on.</p>}
              </div>
            </div>

            <button className="btn-primary" onClick={handleScan}>
              Scan my business — it's free →
            </button>
            <p style={{ fontSize:12, color:C.textLight, textAlign:'center', marginTop:2 }}>Takes 60 seconds · No account needed</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── What we check ─────────────────────────────────────────────────────────────
function WhatCard({ item, index, total }) {
  const [cardRef, cardVisible] = useReveal(index * 80)
  const br = index === 0 ? '14px 0 0 14px' : index === total - 1 ? '0 14px 14px 0' : '0'
  return (
    <div ref={cardRef} className="what-card" style={{ padding:'38px 32px', background:'#fff', border:'1px solid rgba(28,25,23,0.07)', borderRadius:br, opacity:cardVisible?1:0, transform:cardVisible?'none':'translateY(16px)', transition:`all .55s ease ${index*.1}s` }}>
      <div style={{ fontSize:26, marginBottom:18 }}>{item.icon}</div>
      <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:22, letterSpacing:'-.015em', marginBottom:12, color:C.text }}>{item.title}</h3>
      <p style={{ color:C.textMuted, lineHeight:1.75, fontSize:14.5, fontWeight:300 }}>{item.desc}</p>
    </div>
  )
}

function WhatWeCheck() {
  const [ref, visible] = useReveal()
  const items = [
    { icon:'🌐', title:'Your website', desc:'Load speed, mobile experience, SEO meta, copy clarity, call-to-action presence, and trust signals — scored against real benchmarks.' },
    { icon:'📱', title:'Your social content', desc:'TikTok, Instagram, YouTube, X, Facebook, LinkedIn — engagement rates, content mix, hook patterns, posting times, and hashtag strategy.' },
    { icon:'📋', title:'A clear action list', desc:'A score from 0–100 for every area, plus prioritised fixes written in plain language — no jargon, no guessing, no generic advice.' },
  ]
  return (
    <section className="section-pad" style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:16 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>What the scan checks</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>Every part of your online presence,<br />in one report.</h2>
          <p style={{ fontSize:15, color:C.textMuted, fontWeight:300, marginTop:14, maxWidth:520, lineHeight:1.65 }}>
            Both the free scan and the full report analyse these three areas. The free scan shows your score and 2 critical issues — the full report goes deep on every one.
          </p>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:44, flexWrap:'wrap' }}>
          <span style={{ fontSize:12, background:'rgba(42,92,69,0.08)', border:'1px solid rgba(42,92,69,0.18)', borderRadius:20, padding:'5px 14px', color:C.accent, fontWeight:400 }}>✓ Free scan — score + 2 issues</span>
          <span style={{ fontSize:12, background:'rgba(28,25,23,0.05)', border:'1px solid rgba(28,25,23,0.12)', borderRadius:20, padding:'5px 14px', color:C.textMuted, fontWeight:300 }}>★ Full report — all 5 issues + deep analysis</span>
        </div>
        <div className="what-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:2 }}>
          {items.map((item, i) => (
            <WhatCard key={i} item={item} index={i} total={items.length} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Growth Agent Section ─────────────────────────────────────────────────────
function GrowthAgentSection({ navigate }) {
  const [ref, visible] = useReveal()
  const [featuresExpanded, setFeaturesExpanded] = useState(false)

  const featuresTop = [
    { icon:'📸', title:'Before/after screenshots', desc:'Every fix is captured visually. You see exactly what changed and how the page looked before and after — no guesswork.' },
    { icon:'💶', title:'Revenue attribution', desc:'Connect your Stripe and the agent reads real revenue per visitor. The lowest-earning page gets fixed first — not just the highest-bounce one.' },
    { icon:'📱', title:'YES or NO from Telegram', desc:'You get a Telegram message every Monday with the problem, the solution, and the PR link. Reply YES to deploy or NO to skip — done.' },
  ]

  const featuresExtra = [
    { icon:'🔍', title:'Competitor weekly scan', desc:"Track up to 5 competitors. Every Monday the agent checks for hero, CTA, and pricing changes — and tells you what they shipped that you didn't." },
    { icon:'🔥', title:'Monthly roast report', desc:"Once a month, brutal honesty: what improved, what is still embarrassingly bad versus competitors, and what you keep ignoring that the agent can't fix for you." },
    { icon:'🌐', title:'Public impact timeline', desc:'Optional public page at velyr.io/agent/your-slug showing every run, screenshots, and results. Use it as social proof or share with your team.' },
  ]

  const timelinePhases = [
    {
      phase: 'Monday',
      color: C.accent,
      steps: [
        { time:'8:00 am',  icon:'📊', text:'Weekly Executive Summary sent to Telegram — traffic, bounce rate, last week\'s impact.' },
        { time:'9:00 am',  icon:'🔍', text:'Agent reads your PostHog analytics + scans every page in your GitHub repo.' },
        { time:'9:10 am',  icon:'🎯', text:'Identifies the #1 conversion problem across your full funnel.' },
        { time:'9:15 am',  icon:'✍️', text:'Writes the code fix and opens a Pull Request with a live preview link.' },
        { time:'9:20 am',  icon:'📲', text:'Telegram message arrives — problem, data, solution, PR link. Reply YES to ship, NO to skip.' },
      ]
    },
    {
      phase: 'Wednesday',
      color: C.warm,
      steps: [
        { time:'9:00 am',  icon:'📈', text:'Mid-week check: traffic update, bounce rate delta, social traffic sources.' },
      ]
    },
    {
      phase: '+48h after deploy',
      color: C.yellow,
      steps: [
        { time:'Auto',  icon:'🔄', text:'Bounce rate check — if it increased 15%+, the agent auto-reverts and notifies you.' },
      ]
    },
  ]

  return (
    <section id="growth-agent" style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>

        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div style={{ position:'relative', width:10, height:10 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#22c55e', animation:'agentPing 2s ease-out infinite' }} />
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#22c55e' }} />
            </div>
            <span style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, fontWeight:400 }}>Growth Agent</span>
          </div>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 5vw, 60px)', letterSpacing:'-.025em', lineHeight:1.08, color:C.text, marginBottom:20 }}>
            Your website,<br />
            <em style={{ fontStyle:'italic', color:C.warm }}>always improving.</em>
          </h2>
          <p style={{ fontSize:17, color:C.textMuted, lineHeight:1.72, fontWeight:300, maxWidth:520 }}>
            A semi-autonomous AI agent that analyses your analytics, writes conversion fixes, and deploys them — with your approval. Every week, automatically.
          </p>
        </div>

        {/* Top 3 features always visible */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:2, marginBottom:2 }}>
          {featuresTop.map((f, i) => (
            <div key={i} style={{
              background:'#fff',
              border:`1px solid ${C.border}`,
              borderRadius: i===0 ? '14px 0 0 0' : i===2 ? '0 14px 0 0' : '0',
              padding:'32px 28px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(16px)',
              transition: `all .55s ease ${i * 0.07}s`,
            }}>
              <div style={{ fontSize:24, marginBottom:16 }}>{f.icon}</div>
              <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:20, color:C.text, marginBottom:10, letterSpacing:'-.01em' }}>{f.title}</h3>
              <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.72, fontWeight:300 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Expandable extra features */}
        <div style={{ maxHeight:featuresExpanded?400:0, overflow:'hidden', transition:'max-height .4s cubic-bezier(.4,0,.2,1)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:2, marginBottom:2 }}>
            {featuresExtra.map((f, i) => (
              <div key={i} style={{
                background:'#fff',
                border:`1px solid ${C.border}`,
                borderRadius: i===0 ? '0 0 0 14px' : i===2 ? '0 0 14px 0' : '0',
                padding:'32px 28px',
              }}>
                <div style={{ fontSize:24, marginBottom:16 }}>{f.icon}</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:20, color:C.text, marginBottom:10, letterSpacing:'-.01em' }}>{f.title}</h3>
                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.72, fontWeight:300 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => setFeaturesExpanded(o=>!o)} style={{ width:'100%', background:'#fff', border:`1px solid ${C.border}`, borderRadius:'0 0 14px 14px', padding:'13px', fontFamily:'Jost,sans-serif', fontSize:13, fontWeight:300, color:C.textMuted, cursor:'pointer', transition:'all .2s', marginBottom:48, display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}
          onMouseEnter={e=>e.currentTarget.style.background=C.bgSecond}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}
        >
          {featuresExpanded ? '↑ Show less' : `↓ Show ${featuresExtra.length} more features`}
        </button>

        {/* How it works + CTA side by side */}
        <div className="agent-bottom-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>

          <div style={{
            background:'#fff', border:`1px solid ${C.border}`,
            borderRadius:16, padding:'32px 36px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(16px)',
            transition: 'all .6s ease .3s',
          }}>
            <p style={{ fontSize:11, letterSpacing:'.12em', textTransform:'uppercase', color:C.textLight, fontWeight:400, marginBottom:28 }}>Weekly schedule</p>
            {timelinePhases.map((phase, pi) => (
              <div key={pi} style={{ marginBottom: pi < timelinePhases.length - 1 ? 28 : 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:phase.color, flexShrink:0 }} />
                  <span style={{ fontSize:13, fontWeight:500, color:phase.color, letterSpacing:'.02em' }}>{phase.phase}</span>
                  <div style={{ flex:1, height:1, background:C.border }} />
                </div>
                <div style={{ paddingLeft:18, display:'flex', flexDirection:'column', gap:0 }}>
                  {phase.steps.map((step, si) => (
                    <div key={si} style={{
                      display:'flex', gap:14, alignItems:'flex-start',
                      paddingBottom: si < phase.steps.length - 1 ? 14 : 0,
                      marginBottom: si < phase.steps.length - 1 ? 14 : 0,
                      borderBottom: si < phase.steps.length - 1 ? `1px dashed rgba(28,25,23,0.07)` : 'none',
                    }}>
                      <div style={{ width:56, flexShrink:0, paddingTop:1 }}>
                        <span style={{ fontSize:11, color:C.textLight, fontWeight:300, fontFamily:'DM Mono, monospace' }}>{step.time}</span>
                      </div>
                      <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ fontSize:14, lineHeight:1, marginTop:1 }}>{step.icon}</span>
                        <p style={{ fontSize:13, color:C.text, fontWeight:300, lineHeight:1.55 }}>{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { value:'Every Monday', label:'Agent runs automatically', sub:'no manual work needed' },
              { value:'48h', label:'Auto-rollback window', sub:'reverts if metrics drop' },
              { value:'100%', label:'Approval stays with you', sub:'nothing ships without your OK' },
            ].map((stat, i) => (
              <div key={i} style={{
                background:'#fff', border:`1px solid ${C.border}`, borderRadius:14,
                padding:'22px 26px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateX(16px)',
                transition: `all .5s ease ${0.35 + i * 0.1}s`,
              }}>
                <p style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:30, color:C.accent, letterSpacing:'-.02em', lineHeight:1, marginBottom:6 }}>{stat.value}</p>
                <p style={{ fontSize:13, fontWeight:400, color:C.text, marginBottom:2 }}>{stat.label}</p>
                <p style={{ fontSize:12, color:C.textLight, fontWeight:300 }}>{stat.sub}</p>
              </div>
            ))}

            <div style={{
              background:C.accent, borderRadius:14, padding:'28px 26px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(12px)',
              transition: 'all .6s ease .65s',
            }}>
              <p style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:24, color:'#fff', letterSpacing:'-.015em', marginBottom:6 }}>Ready to let the agent work?</p>
              <p style={{ fontSize:13, color:'rgba(247,244,239,0.6)', fontWeight:300, marginBottom:20 }}>Set up in 5 minutes. €29/month. Cancel anytime.</p>
              <div style={{ display:'flex', gap:8, flexDirection:'column' }}>
                <button onClick={() => navigate('/agent/register')} style={{
                  background:'#f7f4ef', color:C.text, border:'none', borderRadius:10,
                  padding:'13px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500,
                  cursor:'pointer', letterSpacing:'.02em', transition:'all .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background='#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background='#f7f4ef' }}
                >Start Growth Agent →</button>
                <button onClick={() => navigate('/agent/login')} style={{
                  background:'transparent', color:'rgba(247,244,239,0.6)',
                  border:'1px solid rgba(247,244,239,0.2)', borderRadius:10,
                  padding:'12px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:300,
                  cursor:'pointer', letterSpacing:'.02em', transition:'all .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(247,244,239,0.4)'; e.currentTarget.style.color='#f7f4ef' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(247,244,239,0.2)'; e.currentTarget.style.color='rgba(247,244,239,0.6)' }}
                >Log in</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Sample report helpers ─────────────────────────────────────────────────────
function SampleMiniBar({ label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
      <div style={{ width:90, fontSize:12, color:C.textMuted, fontWeight:300, flexShrink:0 }}>{label}</div>
      <div style={{ flex:1, height:4, background:'rgba(28,25,23,0.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:2, transition:'width 1.1s cubic-bezier(.4,0,.2,1)' }}/>
      </div>
      <div style={{ width:26, fontSize:12, color, fontWeight:500, textAlign:'right', fontFamily:'DM Mono, monospace' }}>{value}</div>
    </div>
  )
}

function SampleBmRow({ platform, metric, yours, benchmark, diff, up, note }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(28,25,23,0.06)' }}>
      <div>
        <span style={{ fontSize:12, color:C.textMuted, fontWeight:300, display:'block' }}>{platform} · {metric}</span>
        {note && <span style={{ fontSize:10, color:up?C.accent:C.red, fontWeight:400 }}>{note}</span>}
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:500, fontFamily:'Cormorant Garant, serif', color:C.text }}>{yours}</div>
        <div style={{ fontSize:9, color:C.textLight, textTransform:'uppercase', letterSpacing:'.05em' }}>yours</div>
      </div>
      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:up?'rgba(42,92,69,0.1)':'rgba(192,57,43,0.08)', color:up?C.accent:C.red, fontWeight:500 }}>
        {up?'↑':'↓'} {diff}
      </span>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:12, color:C.textLight, fontWeight:300 }}>{benchmark}</div>
        <div style={{ fontSize:9, color:C.textLight, textTransform:'uppercase', letterSpacing:'.05em' }}>avg</div>
      </div>
    </div>
  )
}

// ─── Agent Dashboard Preview ───────────────────────────────────────────────────
function AgentDashboardPreview({ navigate }) {
  const { label: nextRunLabel, pct: nextRunPct } = useNextMondayCountdown()

  return (
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', fontSize:12, fontFamily:'Jost,sans-serif' }}>

      {/* Top header */}
      <div style={{ padding:'28px 32px 0' }}>
        <p style={{ fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:C.textLight, fontWeight:400, marginBottom:6 }}>Growth Agent Dashboard</p>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
          <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(22px,3vw,32px)', color:C.text, letterSpacing:'-.02em', lineHeight:1.1 }}>
            Your website, <em style={{ fontStyle:'italic', color:C.warm }}>always improving.</em>
          </h3>
          <span style={{ fontSize:11, color:C.textLight, fontWeight:300, flexShrink:0, marginLeft:16, marginTop:4 }}>Auto-refreshes every 30s</span>
        </div>

        {/* Pending approval banner */}
        <div style={{ background:'rgba(214,137,16,0.06)', border:'1px solid rgba(214,137,16,0.2)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:16 }}>💬</span>
            <div>
              <p style={{ fontSize:13, fontWeight:500, color:C.text }}>1 PR is waiting for your approval</p>
              <p style={{ fontSize:11, color:C.textLight, fontWeight:300, marginTop:2 }}>
                Reply <code style={{ background:'rgba(28,25,23,0.08)', borderRadius:4, padding:'1px 5px', fontSize:10, fontFamily:'DM Mono, monospace' }}>YES</code> or <code style={{ background:'rgba(28,25,23,0.08)', borderRadius:4, padding:'1px 5px', fontSize:10, fontFamily:'DM Mono, monospace' }}>NO</code> on Telegram
              </p>
            </div>
          </div>
          <button style={{ background:C.yellow, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', flexShrink:0 }}>Review →</button>
        </div>

        {/* Stat cards row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Runs', value:'1', icon:'🔄', highlight:false },
            { label:'Fixes Deployed', value:'0', icon:'🚀', highlight:true },
            { label:'Deploy Rate', value:'0%', icon:'📊', highlight:false },
            { label:'Awaiting Review', value:'1', icon:'🔔', highlight:true, warm:true },
          ].map((s, i) => (
            <div key={i} style={{ background: s.highlight ? (s.warm ? 'rgba(214,137,16,0.06)' : 'rgba(42,92,69,0.06)') : '#fff', border:`1px solid ${s.highlight ? (s.warm ? 'rgba(214,137,16,0.18)' : 'rgba(42,92,69,0.15)') : C.border}`, borderRadius:12, padding:'16px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <p style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, fontWeight:500 }}>{s.label}</p>
                <span style={{ fontSize:14 }}>{s.icon}</span>
              </div>
              <p style={{ fontFamily:'Cormorant Garant, serif', fontSize:36, fontWeight:300, color: s.warm ? C.yellow : s.highlight ? C.accent : C.text, lineHeight:1 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main content: Activity log + sidebar */}
      <div className="dash-preview-grid" style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:0, borderTop:`1px solid ${C.border}` }}>

        {/* Left: Activity log */}
        <div style={{ padding:'20px 24px', borderRight:`1px solid ${C.border}` }}>
          {/* Tabs */}
          <div style={{ display:'flex', gap:20, marginBottom:16, borderBottom:`1px solid ${C.border}`, paddingBottom:12 }}>
            {['Runs','Funnel','Guardrails','Settings'].map((t,i) => (
              <span key={t} style={{ fontSize:13, fontWeight:i===0?500:300, color:i===0?C.text:C.textLight, cursor:'pointer', paddingBottom:12, marginBottom:-13, borderBottom:i===0?`2px solid ${C.text}`:'2px solid transparent' }}>{t}</span>
            ))}
          </div>

          {/* Activity log header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:500, color:C.text }}>Activity Log</p>
              <p style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>Click any run for full details</p>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {['All','Deployed','Awaiting Approval'].map((f,i) => (
                <span key={f} style={{ fontSize:11, padding:'4px 9px', borderRadius:6, background:i===0?C.text:'transparent', color:i===0?'#fff':C.textLight, border:i===0?'none':`1px solid ${C.border}`, cursor:'pointer', fontWeight:i===0?500:300 }}>{f}</span>
              ))}
            </div>
          </div>

          <p style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:10 }}>This week <span style={{ float:'right', textTransform:'none', letterSpacing:0 }}>1 run</span></p>

          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 16px', marginBottom:8, cursor:'pointer' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.yellow, flexShrink:0 }} />
                <span style={{ fontSize:13, color:C.text, fontWeight:300 }}>Analysis pending...</span>
                <span style={{ fontSize:11, color:C.accent, fontWeight:400 }}>PR #4 ↗</span>
              </div>
              <span style={{ fontSize:11, background:'rgba(214,137,16,0.12)', color:C.yellow, border:`1px solid ${C.yellow}33`, borderRadius:5, padding:'3px 8px', fontWeight:500 }}>● Awaiting Approval</span>
            </div>
            <p style={{ fontSize:11, color:C.textLight, fontWeight:300, marginTop:5, paddingLeft:17 }}>9 May, 10:01</p>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div style={{ padding:'20px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Status */}
          <div style={{ background:'rgba(28,25,23,0.03)', borderRadius:10, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#a09890' }} />
              <span style={{ fontSize:13, fontWeight:500, color:C.text }}>IDLE</span>
            </div>
            <span style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>Growth Agent</span>
          </div>

          {/* Next run — live countdown */}
          <div>
            <p style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:8 }}>Next run in</p>
            <p style={{ fontFamily:'Cormorant Garant, serif', fontSize:28, fontWeight:300, color:C.text, letterSpacing:'-.02em' }}>{nextRunLabel}</p>
            <div style={{ height:3, background:C.border, borderRadius:2, margin:'8px 0' }}>
              <div style={{ width:`${nextRunPct}%`, height:'100%', background:C.accent, borderRadius:2, transition:'width 1s ease' }} />
            </div>
            <p style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>Every Monday · 9:00 am</p>
          </div>

          {/* Last run steps */}
          <div>
            <p style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:10 }}>Last run · 9h ago</p>
            {['Fetching repo','Pulling analytics','Scanning competitors','Checking seasonal context','Reading Business DNA','Mapping funnel','Finding biggest issue','Taking before screenshot','Writing fix (or A/B variants)','Opening pull request','Sending notification + email'].map(step => (
              <div key={step} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:'#fff', fontSize:10 }}>✓</span>
                </div>
                <span style={{ fontSize:12, color:C.text, fontWeight:300 }}>{step}</span>
              </div>
            ))}
          </div>

          {/* Awaiting approval */}
          <div style={{ background:'rgba(214,137,16,0.06)', border:'1px solid rgba(214,137,16,0.18)', borderRadius:10, padding:'12px 14px' }}>
            <p style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.yellow, fontWeight:500, marginBottom:6 }}>🔔 1 Awaiting Approval</p>
            <p style={{ fontSize:12, fontWeight:500, color:C.text, marginBottom:3 }}>Fix pending review</p>
            <p style={{ fontSize:11, color:C.textLight, fontWeight:300, marginBottom:8 }}>PR #4 · 9h ago</p>
            <p style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>
              Reply <code style={{ background:'rgba(214,137,16,0.12)', color:C.yellow, borderRadius:4, padding:'1px 5px', fontSize:10, fontFamily:'DM Mono, monospace' }}>YES</code> or <code style={{ background:'rgba(214,137,16,0.12)', color:C.yellow, borderRadius:4, padding:'1px 5px', fontSize:10, fontFamily:'DM Mono, monospace' }}>NO</code> on Telegram
            </p>
          </div>

          {/* Performance */}
          <div>
            <p style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:10 }}>Performance</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              {[
                { label:'Deploy rate', value:'0%', color:C.accent },
                { label:'Fixes merged', value:'0', color:C.text },
                { label:'Awaiting', value:'1', color:C.yellow },
              ].map(m => (
                <div key={m.label}>
                  <p style={{ fontFamily:'Cormorant Garant, serif', fontSize:22, fontWeight:300, color:m.color, lineHeight:1 }}>{m.value}</p>
                  <p style={{ fontSize:11, color:C.textLight, fontWeight:300, marginTop:2 }}>{m.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize:10, color:C.textLight, fontWeight:300, marginBottom:6 }}>Run history</p>
            <div style={{ height:8, borderRadius:4, overflow:'hidden', display:'flex', gap:2 }}>
              <div style={{ flex:1, background:C.yellow, borderRadius:4 }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
              <span style={{ fontSize:10, color:C.textLight }}>oldest</span>
              <span style={{ fontSize:10, color:C.textLight }}>latest</span>
            </div>
          </div>
        </div>
      </div>

      {/* How it works footer */}
      <div style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, padding:'20px 24px' }}>
        <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:14 }}>How it works</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { n:1, text:'Every Monday at 9am, the agent reads your GitHub repo + analytics' },
            { n:2, text:'It detects all pages and maps your conversion funnel automatically' },
            { n:3, text:'Claude finds the biggest drop-off — respecting your Brand Guardrails' },
            { n:4, text:'It writes the fix and opens a Pull Request on GitHub' },
            { n:5, text:'You get a Telegram message — reply YES to deploy or NO to skip' },
            { n:6, text:'After 48h the agent checks metrics — auto-rolls back if no improvement' },
          ].map(s => (
            <div key={s.n} style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', background:C.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                <span style={{ fontSize:10, color:'#fff', fontWeight:500 }}>{s.n}</span>
              </div>
              <p style={{ fontSize:12, color:C.textMuted, fontWeight:300, lineHeight:1.5 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sample Report ─────────────────────────────────────────────────────────────
function SampleReport({ navigate, onScanStart }) {
  const [ref, visible] = useReveal()
  const [tab, setTab] = useState('free')

  const cardStyle = (delay, extra={}) => ({
    background:'#fff', border:'1px solid rgba(28,25,23,0.08)', borderRadius:16, padding:'22px 24px', marginBottom:12,
    opacity:visible?1:0, transform:visible?'none':'translateY(14px)', transition:`all .55s ease ${delay}s`, ...extra
  })
  const accentCardStyle = (delay) => ({ ...cardStyle(delay), border:'1px solid rgba(42,92,69,0.2)' })

  const r=54, circ=2*Math.PI*r

  return (
    <section className="section-pad" style={{ padding:'96px 24px', background:C.bg }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:40 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>Sample output</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>See exactly what you get.</h2>
          <p style={{ color:C.textMuted, marginTop:12, fontSize:15, fontWeight:300 }}>Real data. Benchmark comparisons. Specific fixes — and a live dashboard when you're on the Growth Agent.</p>
        </div>

        <div className="tab-row" style={{ display:'flex', gap:0, marginBottom:32, background:'rgba(28,25,23,0.05)', borderRadius:12, padding:4, width:'fit-content' }}>
          {[
            { key:'free',   label:'Free scan' },
            { key:'full',   label:'★ Full report — €9' },
            { key:'agent',  label:'⚡ Growth Agent dashboard' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background:tab===t.key?'#fff':'transparent',
              border:'none', borderRadius:9, padding:'9px 20px',
              fontFamily:'Jost,sans-serif', fontSize:13, fontWeight:tab===t.key?500:300,
              color:tab===t.key?(t.key==='full'?C.accent:t.key==='agent'?C.warm:C.text):C.textLight,
              cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap',
              boxShadow:tab===t.key?'0 1px 6px rgba(28,25,23,0.1)':'none',
            }}>{t.label}</button>
          ))}
        </div>

        {tab === 'free' && (
          <div className="sample-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:16, alignItems:'start' }}>
            <div>
              <div style={{ ...cardStyle(0.1), display:'flex', gap:18, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                  <svg width="110" height="110" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(28,25,23,0.08)" strokeWidth="8"/>
                    <circle cx="70" cy="70" r={r} fill="none" stroke={C.yellow} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${visible?(41/100)*circ:0} ${circ}`} strokeDashoffset={circ*0.25}
                      style={{ transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.2s' }}/>
                    <text x="70" y="66" textAnchor="middle" fontFamily="Cormorant Garant, serif" fontSize="32" fontWeight="300" fill="#1c1917">41</text>
                    <text x="70" y="81" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="11" fontWeight="300" fill="#a09890" letterSpacing="2">/100</text>
                  </svg>
                  <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.yellow, fontWeight:500 }}>Needs Work</span>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <p style={{ fontSize:13, fontWeight:500, color:C.yellow, marginBottom:6, lineHeight:1.4 }}>At 41/100, you're losing visitors before they read a single word.</p>
                  <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300 }}>Site loads in 6.1s — 3.6s over Google's limit. TikTok engagement 63% below the fitness average. No CTA above the fold.</p>
                </div>
              </div>
              <div style={cardStyle(0.18)}>
                <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:14 }}>Score Breakdown</p>
                <SampleMiniBar label="Performance" value={27} color={C.red} />
                <SampleMiniBar label="SEO"         value={54} color={C.yellow} />
                <SampleMiniBar label="Copy & UX"   value={35} color={C.red} />
                <SampleMiniBar label="TikTok"      value={22} color={C.red} />
              </div>
              <div style={{ ...accentCardStyle(0.24), padding:0, overflow:'hidden' }}>
                <div style={{ padding:'13px 18px 9px', borderBottom:'1px solid rgba(28,25,23,0.07)' }}>
                  <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.accent, fontWeight:500, marginBottom:1 }}>Market Benchmarks</p>
                  <p style={{ fontSize:11, color:C.textMuted, fontWeight:300 }}>vs. Fitness & Health</p>
                </div>
                <div style={{ padding:'2px 18px 8px' }}>
                  <SampleBmRow platform="Website" metric="Mobile Speed" yours="27/100" benchmark="45/100" diff="18pts" up={false} note="Slower than 73% of mobile pages" />
                  <SampleBmRow platform="TikTok"  metric="Engagement"   yours="1.8%" benchmark="4.8%" diff="63%" up={false} note="Worse than 68% of Fitness accounts" />
                  <SampleBmRow platform="TikTok"  metric="Avg. Views"   yours="4,200" benchmark="15,000" diff="72%" up={false} />
                </div>
              </div>
            </div>
            <div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:9 }}>
                  <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500 }}>Priority Actions</p>
                  <p style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>2 of 5 shown</p>
                </div>
                {[
                  { bg:'#fdf2f2', border:'#f5c6c6', label:'🔴 Critical', color:C.red, title:'Site takes 6.1s to load — fix the hero image', desc:'Your load time puts you in the bottom 27% of mobile pages. Compress your hero image to under 150kb and add loading="eager" to cut it to under 2s.' },
                  { bg:'#fdf2f2', border:'#f5c6c6', label:'🔴 Critical', color:C.red, title:'No call-to-action above the fold — visitors leave', desc:'Sites with a visible CTA above the fold convert 3.5× better. Add one button in the first viewport with a benefit-led label.' },
                ].map((issue, i) => (
                  <div key={i} style={{ background:issue.bg, border:`1px solid ${issue.border}`, borderRadius:12, padding:'15px 17px', marginBottom:10, opacity:visible?1:0, transform:visible?'none':'translateX(14px)', transition:`all .5s ease ${0.28+i*0.08}s` }}>
                    <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:issue.color, fontWeight:500, display:'block', marginBottom:4 }}>{issue.label}</span>
                    <p style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>{issue.title}</p>
                    <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300 }}>{issue.desc}</p>
                  </div>
                ))}
                <div style={{ background:'#fefdf2', border:'1px solid #f5e6a3', borderRadius:12, padding:'15px 17px', position:'relative', overflow:'hidden', opacity:visible?1:0, transform:visible?'none':'translateX(14px)', transition:'all .5s ease .44s' }}>
                  <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.yellow, fontWeight:500, display:'block', marginBottom:4 }}>🟡 Important</span>
                  <p style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>TikTok engagement 63% below fitness average</p>
                  <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300, filter:'blur(4px)', userSelect:'none', pointerEvents:'none' }}>Your 1.8% engagement vs 4.8% fitness benchmark means your hooks aren't landing. Your top 3 videos average 4× normal views — reverse-engineer their first 2 seconds.</p>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, height:40, background:'linear-gradient(transparent, rgba(254,253,242,0.9))' }} />
                </div>
              </div>
              <div style={{ background:'#fff', border:'1px solid rgba(42,92,69,0.22)', borderRadius:16, padding:'24px 22px', textAlign:'center', opacity:visible?1:0, transform:visible?'none':'translateY(10px)', transition:'all .5s ease .5s' }}>
                <div style={{ fontSize:18, marginBottom:9 }}>★</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:20, letterSpacing:'-.015em', marginBottom:7, color:C.text }}>Get the full report — €9</h3>
                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.65, fontWeight:300, marginBottom:14, maxWidth:280, margin:'0 auto 14px' }}>All 5 issues, exact step-by-step fixes, deep social analysis, caption rewrites, and benchmarks.</p>
                <button onClick={() => setTab('full')} style={{ background:'rgba(42,92,69,0.08)', color:C.accent, border:'1px solid rgba(42,92,69,0.2)', borderRadius:8, padding:'8px 18px', fontSize:12, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', marginBottom:12, transition:'all .2s' }}>See full report sample ↓</button>
                <br />
                <button onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth', block:'center' })} style={{ background:C.text, color:C.bg, border:'none', borderRadius:9, padding:'12px 24px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accent}
                  onMouseLeave={e=>e.currentTarget.style.background=C.text}
                >Scan my business first — it's free</button>
                <p style={{ fontSize:11, color:C.textLight, marginTop:9, fontWeight:300 }}>Free scan · No account · Instant</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'full' && (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <p style={{ fontSize:32, marginBottom:16 }}>📋</p>
            <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:32, letterSpacing:'-.02em', marginBottom:12, color:C.text }}>Full report includes everything.</h3>
            <p style={{ fontSize:15, color:C.textMuted, fontWeight:300, maxWidth:480, margin:'0 auto 32px', lineHeight:1.7 }}>All 5 priority actions with exact copy-paste fixes, deep social dive, hook analysis on every post, caption rewrites, brand clarity score, and an action plan by time required.</p>
            <button onClick={() => navigate('/premium')} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:'14px 28px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#1e4433'}
              onMouseLeave={e=>e.currentTarget.style.background=C.accent}
            >Get the full report — €9 →</button>
            <p style={{ fontSize:12, color:C.textLight, marginTop:10, fontWeight:300 }}>No account · Results in ~60 seconds</p>
          </div>
        )}

        {tab === 'agent' && (
          <div>
            <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <p style={{ fontSize:14, color:C.textMuted, fontWeight:300, maxWidth:480, lineHeight:1.65 }}>
                  This is your Growth Agent dashboard after connecting your website, PostHog analytics, and GitHub. Example data shown.
                </p>
              </div>
              <button onClick={() => navigate('/agent/register')} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:'12px 22px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s', flexShrink:0 }}
                onMouseEnter={e=>e.currentTarget.style.background='#1e4433'}
                onMouseLeave={e=>e.currentTarget.style.background=C.accent}
              >Start Growth Agent — €29/mo →</button>
            </div>
            <AgentDashboardPreview navigate={navigate} />
            <p style={{ fontSize:12, color:C.textLight, marginTop:14, textAlign:'center', fontWeight:300 }}>Set up in 5 minutes · Cancel anytime · Nothing ships without your OK</p>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing({ navigate }) {
  const [ref, visible] = useReveal()

  const scrollToScan = () => {
    document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth', block:'center' })
  }

  return (
    <section id="pricing-section" className="section-pad" style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:56 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>Pricing</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.02em' }}>Simple. No surprises.</h2>
        </div>
        <div className="pricing-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16, alignItems:'start' }}>

          {/* Free scan card */}
          <div style={{
            background:'#fff', border:'1px solid rgba(28,25,23,0.08)', borderRadius:18, padding:32,
            opacity:visible?1:0, transform:visible?'none':'translateY(20px)', transition:'all .55s ease 0s',
          }}>
            <p style={{ fontWeight:500, fontSize:15, marginBottom:5, color:C.text }}>Free scan</p>
            <p style={{ color:C.textLight, fontSize:13, fontWeight:300, marginBottom:20 }}>See where you stand.</p>
            <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:52, letterSpacing:'-.03em', color:C.text }}>€0</span>
            <p style={{ color:C.textLight, fontSize:12, marginBottom:26, fontWeight:300, marginTop:4 }}>no account required</p>
            <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:28 }}>
              {['Overall score 0–100','Full website analysis (speed, SEO, copy)','Social media stats & engagement rates','Industry benchmark comparisons','Your 2 most critical issues to fix','No account needed — ever'].map((f,j) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13 }}>
                  <span style={{ color:C.textLight, flexShrink:0, marginTop:1 }}>✓</span>
                  <span style={{ color:C.textMuted, fontWeight:300 }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={scrollToScan} style={{ background:'transparent', color:C.text, border:'1px solid rgba(28,25,23,0.18)', borderRadius:10, padding:'14px 28px', fontSize:15, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', width:'100%', letterSpacing:'.03em', transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(28,25,23,0.03)'; e.currentTarget.style.borderColor='rgba(28,25,23,0.35)'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(28,25,23,0.18)'; e.currentTarget.style.transform='none' }}
            >Start for free</button>
          </div>

          {/* Full report card — navigates to /premium */}
          <div style={{
            background:'#fff', border:'1px solid rgba(42,92,69,0.28)', borderRadius:18, padding:32, position:'relative',
            opacity:visible?1:0, transform:visible?'none':'translateY(20px)', transition:'all .55s ease .12s',
            boxShadow:'0 8px 40px rgba(42,92,69,0.1)',
          }}>
            <div style={{ position:'absolute', top:18, right:18, background:C.accent, color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:500, letterSpacing:'.05em' }}>Most popular</div>
            <p style={{ fontWeight:500, fontSize:15, marginBottom:5, color:C.text }}>Full report</p>
            <p style={{ color:C.textLight, fontSize:13, fontWeight:300, marginBottom:20 }}>Everything you need to actually improve.</p>
            <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:52, letterSpacing:'-.03em', color:C.text }}>€9</span>
            <p style={{ color:C.textLight, fontSize:12, marginBottom:26, fontWeight:300, marginTop:4 }}>one-time · no subscription</p>
            <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:28 }}>
              {[
                'Everything in the free scan',
                'All 5 priority actions with exact fixes',
                'Deep social analysis on your focus platform',
                '  → Best posting times from your data',
                '  → Content mix & hook pattern breakdown',
                '  → Hashtag strategy analysis',
                'Hook quality analysis — post by post',
                'Caption & CTA rewrite suggestions',
                'Brand clarity score + specific improvements',
              ].map((f,j) => {
                const isIndented = f.startsWith('  →')
                const text = isIndented ? f.trim() : f
                return (
                  <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13, paddingLeft:isIndented?16:0 }}>
                    <span style={{ color:isIndented?C.textLight:C.accent, flexShrink:0, marginTop:1, fontSize:isIndented?11:13 }}>{isIndented?'→':'✓'}</span>
                    <span style={{ color:isIndented?C.textLight:C.textMuted, fontWeight:300, fontSize:isIndented?12:13 }}>{text}</span>
                  </div>
                )
              })}
            </div>

            {/* CTA — goes to /premium (PremiumScanForm with handle input + auto-pull) */}
            <div style={{ background:'rgba(42,92,69,0.04)', border:'1px solid rgba(42,92,69,0.15)', borderRadius:12, padding:'16px', marginBottom:0 }}>
              <p style={{ fontSize:12, color:C.accent, fontWeight:400, marginBottom:4 }}>
                Website + social handles — all pulled automatically.
              </p>
              <p style={{ fontSize:11, color:C.textLight, fontWeight:300, marginBottom:12 }}>
                No manual numbers needed. We scrape your real data.
              </p>
              <button onClick={() => navigate('/premium')} style={{
                background:C.text, color:'#f7f4ef', border:'none', borderRadius:9,
                padding:'13px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500,
                cursor:'pointer', width:'100%', letterSpacing:'.02em', transition:'background .2s',
              }}
                onMouseEnter={e=>e.currentTarget.style.background=C.accent}
                onMouseLeave={e=>e.currentTarget.style.background=C.text}
              >Get full report — €9 →</button>
              <p style={{ fontSize:11, color:C.textLight, textAlign:'center', marginTop:8, fontWeight:300 }}>No account · Results in ~60 seconds</p>
            </div>
          </div>

          {/* Growth Agent card */}
          <div style={{
            background:C.accent, border:'none', borderRadius:18, padding:32, position:'relative',
            opacity:visible?1:0, transform:visible?'none':'translateY(20px)', transition:'all .55s ease .24s',
            boxShadow:'0 8px 40px rgba(42,92,69,0.25)',
          }}>
            <div style={{ position:'absolute', top:18, right:18, background:'rgba(247,244,239,0.2)', color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:500, letterSpacing:'.05em', display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
              Autonomous
            </div>
            <p style={{ fontWeight:500, fontSize:15, marginBottom:5, color:'rgba(247,244,239,0.9)' }}>Growth Agent</p>
            <p style={{ color:'rgba(247,244,239,0.6)', fontSize:13, fontWeight:300, marginBottom:20 }}>Autonomous weekly improvements.</p>
            <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:52, letterSpacing:'-.03em', color:'#fff' }}>€29</span>
            <p style={{ color:'rgba(247,244,239,0.5)', fontSize:12, marginBottom:26, fontWeight:300, marginTop:4 }}>per month · cancel anytime</p>
            <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:28 }}>
              {['AI analyses your repo + analytics weekly','Identifies #1 conversion problem','Writes the code fix automatically','Opens a GitHub Pull Request','Reply YES or NO via Telegram','Auto-rollback if metrics drop','Before/after screenshots per fix','Revenue attribution (connect Stripe)','Competitor weekly scan','Brand Guardrails — your rules enforced','Full funnel analysis (all pages)','Multi-page sprint when root cause is shared','Weekly email summary','Monthly roast report — brutal honesty','Business DNA — learns over time','A/B testing automation','Public impact timeline (shareable)'].map((f,j) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13 }}>
                  <span style={{ color:'rgba(247,244,239,0.7)', flexShrink:0, marginTop:1 }}>✓</span>
                  <span style={{ color:'rgba(247,244,239,0.85)', fontWeight:300 }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/agent/register')} style={{ background:'#f7f4ef', color:C.text, border:'none', borderRadius:10, padding:'14px 28px', fontSize:15, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', width:'100%', letterSpacing:'.03em', transition:'all .2s' }}
              onMouseEnter={e=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='#f7f4ef'; e.currentTarget.style.transform='none' }}
            >Start Growth Agent</button>
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const [ref, visible] = useReveal()
  const [open, setOpen] = useState(null)
  const [activeTab, setActiveTab] = useState('scan')

  const scanItems = [
    { q:'Do I need an account?', a:'No. You can scan your business and see your score without creating an account. The full report is a one-time €9 payment — no login, no subscription.' },
    { q:'Which platforms does Velyr support?', a:'Website, TikTok, Instagram, YouTube, X (Twitter), Facebook, and LinkedIn. You don\'t need all of them — just add what you have. For the full report you can pick one platform as your "focus" for a deeper analysis.' },
    { q:"Free vs. full report — what's the real difference?", a:'The free scan gives you your score, website analysis, social stats, benchmark comparisons, and your 2 most critical issues. The full report (€9, one-time) adds all 5 issues with exact copy-paste fixes, the deep social dive on your focus platform, hook-by-hook analysis of your posts, a caption rewrite, and brand clarity scoring.' },
    { q:'How accurate is the analysis?', a:"We use real scraped data from your profiles — actual engagement rates, real posts, real timestamps. The AI interprets this data and identifies patterns. It's not perfect, but it's based on what actually happens in your account, not generic advice." },
    { q:'Is my data safe?', a:'Yes. Your data is only used to run the agent and generate your reports. We never sell or share it.' },
  ]

  const agentItems = [
    { q:'What is the Growth Agent?', a:'The Growth Agent is a semi-autonomous AI that runs every Monday. It reads your real PostHog analytics and your GitHub repo, finds the biggest conversion problem, writes the code fix, opens a Pull Request, and sends you a Telegram message — reply YES to deploy or NO to skip. All automatically.' },
    { q:'Do I have to approve every change before it goes live?', a:'Yes, always. Nothing ships without your explicit approval. You receive a Telegram message with the problem, the data behind it, the solution, and the PR link. Reply YES to deploy it, or NO to skip it.' },
    { q:"What happens if the agent's change makes things worse?", a:'The agent checks your bounce rate 48 hours after every deployment. If it increased by 15+ percentage points, it automatically creates a rollback PR, merges it, and notifies you via Telegram. Your site reverts without any manual work.' },
    { q:'What are Brand Guardrails?', a:'Rules you set in your dashboard that the agent must follow on every run — tone of voice, things it can never do, elements it must never change. Any suggestion that violates your guardrails is automatically rejected.' },
    { q:'What is Full Funnel analysis?', a:'Instead of only looking at your homepage, the agent scans every page in your GitHub repo, cross-references them with your real analytics, and identifies where visitors are dropping off. It then prioritises the highest-leverage page to fix.' },
  ]

  const items = activeTab === 'scan' ? scanItems : agentItems

  return (
    <section className="section-pad" style={{ padding:'96px 24px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:40 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>FAQ</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 48px)', letterSpacing:'-.02em' }}>Questions you might have.</h2>
        </div>

        <div style={{ display:'flex', gap:0, marginBottom:32, background:'rgba(28,25,23,0.05)', borderRadius:10, padding:4, width:'fit-content' }}>
          {[{ key:'scan', label:'Free Scan & Full Report' }, { key:'agent', label:'Growth Agent' }].map(t => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setOpen(null) }} style={{
              background:activeTab===t.key?'#fff':'transparent',
              border:'none', borderRadius:7, padding:'9px 18px',
              fontFamily:'Jost,sans-serif', fontSize:13, fontWeight:activeTab===t.key?500:300,
              color:activeTab===t.key?C.text:C.textLight,
              cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap',
              boxShadow:activeTab===t.key?'0 1px 6px rgba(28,25,23,0.1)':'none',
            }}>{t.label}</button>
          ))}
        </div>

        {items.map((item, i) => (
          <div key={`${activeTab}-${i}`} style={{ borderBottom:`1px solid ${C.border}` }}>
            <button onClick={() => setOpen(open===i?null:i)} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'19px 0', textAlign:'left' }}>
              <span style={{ fontWeight:400, fontSize:15, color:C.text, paddingRight:16 }}>{item.q}</span>
              <span style={{ color:C.textLight, fontSize:20, lineHeight:1, flexShrink:0, transition:'transform .25s', transform:open===i?'rotate(45deg)':'none', display:'block' }}>+</span>
            </button>
            <div style={{ maxHeight:open===i?400:0, overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1)' }}>
              <p style={{ color:C.textMuted, fontSize:14.5, lineHeight:1.75, fontWeight:300, paddingBottom:20 }}>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const [ref, visible] = useReveal()
  return (
    <section style={{ background:C.text, padding:'96px 24px' }}>
      <div ref={ref} style={{ maxWidth:520, margin:'0 auto', textAlign:'center', opacity:visible?1:0, transform:visible?'none':'translateY(20px)', transition:'all .65s ease' }}>
        <div style={{ marginBottom:28, animation:visible?'float 4s ease-in-out infinite':'none', display:'inline-block' }}>
          <Logo size={36} color="#f0ece4" />
        </div>
        <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, color:C.bg, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.025em', lineHeight:1.1, marginBottom:16 }}>Your score is one scan away.</h2>
        <p style={{ color:'rgba(247,244,239,0.5)', fontSize:16, marginBottom:40, lineHeight:1.7, fontWeight:300 }}>Find out in under a minute what's holding your business back — and exactly how to fix it.</p>
        <button onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth', block:'center' })} style={{ background:C.bg, color:C.text, border:'none', borderRadius:10, padding:'15px 32px', fontFamily:'Jost,sans-serif', fontWeight:500, fontSize:15, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s', display:'inline-block' }}
          onMouseEnter={e=>e.target.style.background='#ede8e0'}
          onMouseLeave={e=>e.target.style.background=C.bg}
        >Scan my business — it's free</button>
        <p style={{ marginTop:14, fontSize:12, color:'rgba(247,244,239,0.25)', fontWeight:300 }}>No account · No credit card · Instant results</p>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer({ navigate }) {
  return (
    <footer style={{ borderTop:`1px solid ${C.border}`, padding:'24px 24px', background:C.bg }}>
      <div className="footer-inner" style={{ maxWidth:1060, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Logo size={20} />
          <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:16, color:C.text }}>Velyr</span>
        </div>
        <p style={{ fontSize:13, color:C.textLight, fontWeight:300 }}>© 2026 Velyr · <a href="mailto:info@velyr.io" style={{ color:C.textLight, textDecoration:'none' }}>info@velyr.io</a></p>
        <div style={{ display:'flex', gap:20 }}>
          {[
            { label:'Privacy Policy', path:'/privacy' },
            { label:'Impressum', path:'/impressum' },
            { label:'AGB', path:'/agb' },
            { label:'Agent Login →', path:'/agent/login' },
          ].map(l => (
            <button key={l.label} onClick={() => navigate(l.path)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:C.textLight, fontFamily:'Jost,sans-serif', fontWeight:300, transition:'color .2s' }}
              onMouseEnter={e=>e.target.style.color=C.textMuted}
              onMouseLeave={e=>e.target.style.color=C.textLight}
            >{l.label}</button>
          ))}
        </div>
      </div>
    </footer>
  )
}

export default function Home({ navigate, onScanStart }) {
  return (
    <>
      <style>{CSS}</style>
      <Nav navigate={navigate} />
      <Hero onScanStart={onScanStart} navigate={navigate} />
      <WhatWeCheck />
      <GrowthAgentSection navigate={navigate} />
      <SampleReport navigate={navigate} onScanStart={onScanStart} />
      <Pricing navigate={navigate} />
      <FAQ />
      <FinalCTA />
      <Footer navigate={navigate} />
    </>
  )
}