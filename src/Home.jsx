import { useState, useEffect, useRef } from 'react'
import { demoData } from './data/demoData'
import SubscribeButton, { beginCheckout } from './components/SubscribeButton.jsx'

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

  html, body { overflow-x: hidden; max-width: 100vw; }
  img, svg, video { max-width: 100%; height: auto; }

  .nav-burger { display: none; }
  .nav-mobile-panel { display: none; }

  @media (max-width: 640px) {
    nav { padding: 0 16px !important; }
    .nav-ctas { gap: 6px !important; }
    .nav-cta-ghost { display: none !important; }
    .nav-agent-link { display: none !important; }
    .nav-burger { display: flex !important; }
    .hero-pad { padding: 96px 16px 64px !important; }
    .scan-form { padding: 20px 16px !important; }
    .section-pad { padding: 64px 16px !important; }
    .sample-grid { grid-template-columns: 1fr !important; }
    .pricing-grid { grid-template-columns: 1fr !important; }
    .what-grid { grid-template-columns: 1fr !important; gap: 2px !important; }
    .what-card:first-child { border-radius: 14px 14px 0 0 !important; }
    .what-card:last-child  { border-radius: 0 0 14px 14px !important; }
    .what-card { border-radius: 0 !important; padding: 28px 22px !important; }
    .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
    .chips-row { flex-wrap: wrap !important; }
    .tab-row { overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; }
    .agent-flow { flex-direction: column !important; }
    .agent-flow-arrow { transform: rotate(90deg) !important; }
    .agent-bottom-grid { grid-template-columns: 1fr !important; }
    .agent-features-grid { grid-template-columns: 1fr !important; }
    .footer { padding: 24px 16px !important; }
    .footer-links { flex-wrap: wrap !important; gap: 10px !important; }
    .sample-bm-col-hide { display: none !important; }
    .sample-bm-row { grid-template-columns: 1fr auto !important; gap: 6px !important; }
    .agent-cta-card { padding: 22px 20px !important; }
    .pricing-card { padding: 26px 22px !important; }
    .growth-section { padding: 64px 16px !important; }
    .nav-logo-text { font-size: 18px !important; }
  }

  @media (max-width: 900px) {
    .agent-bottom-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 768px) {
    .dash-preview-shell .dp-leftnav { display: none !important; }
    .dash-preview-shell { flex-direction: column !important; }
    .dash-preview-shell .dp-main { padding: 18px 16px !important; }
    .dash-preview-shell .dp-overview-grid { flex-direction: column !important; }
    .dash-preview-shell .dp-rightsb { width: 100% !important; min-width: 0 !important; max-width: none !important; flex-basis: auto !important; }
    .dash-preview-shell .dp-kpis { grid-template-columns: repeat(2, 1fr) !important; }
    .dash-preview-shell .dp-2col { flex-direction: column !important; }
    .dash-preview-shell .dp-2col > div { flex: 1 1 100% !important; width: 100% !important; max-width: 100% !important; }
    .dash-preview-shell code { display: none !important; }
  }
  @media (max-width: 480px) {
    .dash-preview-shell .dp-kpis { grid-template-columns: 1fr !important; }
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  useEffect(() => { const fn = () => setScrolled(window.scrollY > 32); window.addEventListener('scroll', fn); return () => window.removeEventListener('scroll', fn) }, [])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  const goAndClose = (fn) => () => { setMenuOpen(false); fn() }

  const handleFullScanCheckout = async () => {
    if (checkoutLoading) return
    setCheckoutLoading(true)
    try {
      const result = await beginCheckout('full_scan', navigate)
      if (!result?.redirected) setCheckoutLoading(false)
    } catch (e) {
      console.error('Checkout error:', e)
      setCheckoutLoading(false)
    }
  }

  return (
    <>
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100, height:60,
        padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background: scrolled || menuOpen ? 'rgba(247,244,239,0.93)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(16px)' : 'none',
        borderBottom: scrolled || menuOpen ? '1px solid rgba(28,25,23,0.08)' : '1px solid transparent',
        transition:'all .35s ease',
      }}>
        <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer', minWidth:0, flexShrink:1 }}>
          <Logo size={24} />
          <span className="nav-logo-text" style={{ fontFamily:'Cormorant Garant, serif', fontWeight:500, fontSize:20, color:C.text, letterSpacing:'-.01em' }}>Velyr</span>
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
            <button onClick={handleFullScanCheckout} disabled={checkoutLoading}
              style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontFamily:'Jost,sans-serif', fontWeight:500, fontSize:13, cursor: checkoutLoading ? 'not-allowed' : 'pointer', opacity: checkoutLoading ? 0.7 : 1, transition:'background .2s', letterSpacing:'.01em', whiteSpace:'nowrap' }}
              onMouseEnter={e => { if (!checkoutLoading) e.target.style.background='#1e4433' }}
              onMouseLeave={e => { if (!checkoutLoading) e.target.style.background=C.accent }}
            >{checkoutLoading ? 'Redirecting…' : 'Full report'}</button>
          </div>
          <button
            className="nav-burger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background:'transparent', border:'1px solid rgba(28,25,23,0.15)',
              borderRadius:8, width:38, height:38, padding:0,
              alignItems:'center', justifyContent:'center', cursor:'pointer',
              transition:'all .2s', flexShrink:0,
            }}
          >
            <span style={{ position:'relative', display:'block', width:16, height:12 }}>
              <span style={{ position:'absolute', left:0, right:0, height:1.5, background:C.text, borderRadius:1, top: menuOpen ? 5 : 0, transform: menuOpen ? 'rotate(45deg)' : 'none', transition:'all .25s ease' }} />
              <span style={{ position:'absolute', left:0, right:0, height:1.5, background:C.text, borderRadius:1, top:5, opacity: menuOpen ? 0 : 1, transition:'opacity .15s ease' }} />
              <span style={{ position:'absolute', left:0, right:0, height:1.5, background:C.text, borderRadius:1, top: menuOpen ? 5 : 10, transform: menuOpen ? 'rotate(-45deg)' : 'none', transition:'all .25s ease' }} />
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        onClick={() => setMenuOpen(false)}
        style={{
          position:'fixed', inset:0, zIndex:90,
          background:'rgba(28,25,23,0.35)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition:'opacity .25s ease',
        }}
      />
      <div
        className="nav-mobile-panel-root"
        style={{
          position:'fixed', top:60, left:0, right:0, zIndex:95,
          background:'rgba(247,244,239,0.98)', backdropFilter:'blur(16px)',
          borderBottom:'1px solid rgba(28,25,23,0.08)',
          boxShadow:'0 8px 24px rgba(28,25,23,0.08)',
          padding:'16px 20px 22px',
          transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition:'opacity .25s ease, transform .25s ease',
          display:'flex', flexDirection:'column', gap:8,
        }}
      >
        <button onClick={goAndClose(() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' }))}
          style={{ width:'100%', background:'transparent', color:C.text, border:`1px solid ${C.border}`, borderRadius:10, padding:'13px 16px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:400, cursor:'pointer', textAlign:'left', letterSpacing:'.01em' }}
        >Free scan</button>
        <button onClick={goAndClose(handleFullScanCheckout)} disabled={checkoutLoading}
          style={{ width:'100%', background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:'13px 16px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500, cursor: checkoutLoading ? 'not-allowed' : 'pointer', opacity: checkoutLoading ? 0.7 : 1, textAlign:'left', letterSpacing:'.01em' }}
        >{checkoutLoading ? 'Redirecting…' : 'Full report — €9'}</button>
        <button onClick={goAndClose(() => document.getElementById('pricing-section')?.scrollIntoView({ behavior:'smooth' }))}
          style={{ width:'100%', background:'transparent', color:C.accent, border:`1px solid rgba(42,92,69,0.35)`, borderRadius:10, padding:'13px 16px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:400, cursor:'pointer', textAlign:'left', letterSpacing:'.01em', display:'flex', alignItems:'center', gap:8 }}
        >
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e', display:'inline-block' }} />
          Growth Agent — €29/mo
        </button>
        <button onClick={goAndClose(() => navigate('/agent/login'))}
          style={{ width:'100%', background:'transparent', color:C.textMuted, border:'none', borderRadius:10, padding:'12px 16px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:300, cursor:'pointer', textAlign:'left' }}
        >Log in →</button>
      </div>
    </>
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
    { icon:'💶', title:'Revenue attribution', desc:'Connect your Stripe and the agent reads real revenue per visitor. The lowest-earning page gets fixed first — not just the highest-bounce one.' },
    { icon:'📱', title:'YES or NO from Telegram', desc:'You get a Telegram message every Monday with the problem, the solution, and the PR link. Reply YES to deploy or NO to skip — done.' },
  ]

  const featuresExtra = [
    { icon:'🔍', title:'Competitor weekly scan', desc:"Track up to 5 competitors. Every Monday the agent checks for hero, CTA, and pricing changes — and tells you what they shipped that you didn't." },
    { icon:'🔥', title:'Monthly roast report', desc:"Once a month, brutal honesty: what improved, what is still embarrassingly bad versus competitors, and what you keep ignoring that the agent can't fix for you." },
    { icon:'🌐', title:'Public impact timeline', desc:'Optional public page at velyr.io/agent/your-slug showing every run and its results. Use it as social proof or share with your team.' },
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
    <section id="growth-agent" className="growth-section" style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'96px 24px' }}>
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

        {/* Top features always visible */}
        <div className="agent-features-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:2, marginBottom:2 }}>
          {featuresTop.map((f, i) => (
            <div key={i} style={{
              background:'#fff',
              border:`1px solid ${C.border}`,
              borderRadius: i===0 ? '14px 0 0 0' : '0 14px 0 0',
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
          <div className="agent-features-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:2, marginBottom:2 }}>
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

            <div className="agent-cta-card" style={{
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
                  background:'transparent', color:'rgba(247,244,239,0.9)',
                  border:'1px solid rgba(247,244,239,0.35)', borderRadius:10,
                  padding:'12px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:400,
                  cursor:'pointer', letterSpacing:'.02em', transition:'all .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(247,244,239,0.6)'; e.currentTarget.style.color='#f7f4ef' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(247,244,239,0.35)'; e.currentTarget.style.color='rgba(247,244,239,0.9)' }}
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
    <div className="sample-bm-row" style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:8, alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(28,25,23,0.06)' }}>
      <div>
        <span style={{ fontSize:12, color:C.textMuted, fontWeight:300, display:'block' }}>{platform} · {metric}</span>
        {note && <span style={{ fontSize:10, color:up?C.accent:C.red, fontWeight:400 }}>{note}</span>}
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:500, fontFamily:'Cormorant Garant, serif', color:C.text }}>{yours}</div>
        <div style={{ fontSize:9, color:C.textLight, textTransform:'uppercase', letterSpacing:'.05em' }}>yours</div>
      </div>
      <span className="sample-bm-col-hide" style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background:up?'rgba(42,92,69,0.1)':'rgba(192,57,43,0.08)', color:up?C.accent:C.red, fontWeight:500 }}>
        {up?'↑':'↓'} {diff}
      </span>
      <div className="sample-bm-col-hide" style={{ textAlign:'right' }}>
        <div style={{ fontSize:12, color:C.textLight, fontWeight:300 }}>{benchmark}</div>
        <div style={{ fontSize:9, color:C.textLight, textTransform:'uppercase', letterSpacing:'.05em' }}>avg</div>
      </div>
    </div>
  )
}

// ─── Agent Dashboard Preview ───────────────────────────────────────────────────
function AgentDashboardPreview({ navigate }) {
  const runs          = demoData.runs
  const funnelPages   = demoData.funnelPages
  const learnings     = demoData.learnings
  const impactMetrics = demoData.impactMetrics

  const total          = runs.length
  const deployed       = runs.filter(r => r.status === 'deployed').length
  const deployRate     = Math.round((deployed / total) * 100)
  const pendingCount   = runs.filter(r => r.status === 'waiting_approval').length
  const failedRejected = runs.filter(r => r.status === 'failed' || r.status === 'rejected').length

  const bounceImprove = impactMetrics.filter(m => m.value_before && m.value_after)
  const avgDelta = bounceImprove.length > 0
    ? Math.round(bounceImprove.reduce((s,m) => s + (m.value_before - m.value_after), 0) / bounceImprove.length)
    : null

  const topDropOff = [...funnelPages].filter(p => p.drop_off_score > 0).sort((a,b) => b.drop_off_score - a.drop_off_score)[0]
  const bestImpact = [...impactMetrics].filter(m => m.value_before > m.value_after).sort((a,b) => (b.value_before-b.value_after) - (a.value_before-a.value_after))[0]
  const bestRun    = bestImpact ? runs.find(r => r.id === bestImpact.run_id) : null

  const positiveLearnings = learnings.filter(l => l.outcome === 'positive')
  const winRate = learnings.length > 0 ? Math.round((positiveLearnings.length / learnings.length) * 100) : null

  const deployedRuns = runs.filter(r => r.status === 'deployed')
  const avgConvNum = deployedRuns.length > 0
    ? deployedRuns
        .map(r => parseFloat((r.analysis_result?.expected_improvement || '').replace(/[^0-9.]/g, '')) || 0)
        .reduce((s,v) => s+v, 0) / deployedRuns.length
    : null

  // Mirror the real dashboard's design tokens (Home.jsx fonts, AgentDashboard colors)
  const DC = {
    bg:          '#f7f4ef',
    bgCard:      '#ffffff',
    bgPanel:     '#faf8f4',
    text:        '#1a1916',
    textMuted:   '#6b6460',
    textLight:   '#a09890',
    border:      'rgba(26,25,22,0.08)',
    accent:      '#2a5c45',
    accentSoft:  'rgba(42,92,69,0.07)',
    accentMid:   'rgba(42,92,69,0.15)',
    green:       '#1e7a3c',
    greenSoft:   'rgba(30,122,60,0.07)',
    greenMid:    'rgba(30,122,60,0.2)',
    yellow:      '#c47d0e',
    yellowSoft:  'rgba(196,125,14,0.07)',
    yellowMid:   'rgba(196,125,14,0.18)',
    blue:        '#1d5fa8',
    blueSoft:    'rgba(29,95,168,0.07)',
    blueMid:     'rgba(29,95,168,0.15)',
    red:         '#b83232',
    redSoft:     'rgba(184,50,50,0.07)',
    redMid:      'rgba(184,50,50,0.18)',
    mutedSoft:   'rgba(107,100,96,0.07)',
    mutedMid:    'rgba(107,100,96,0.18)',
  }

  const STATUS_MAP = {
    deployed:         { label:'Deployed',          color:DC.green,     bg:DC.greenSoft,  border:DC.greenMid,  dot:DC.green     },
    waiting_approval: { label:'Awaiting Approval', color:DC.yellow,    bg:DC.yellowSoft, border:DC.yellowMid, dot:DC.yellow    },
    rejected:         { label:'Rejected',          color:DC.red,       bg:DC.redSoft,    border:DC.redMid,    dot:DC.red       },
    rolled_back:      { label:'Rolled Back',       color:DC.textMuted, bg:DC.mutedSoft,  border:DC.mutedMid,  dot:DC.textMuted },
  }

  const NAV_ITEMS = [
    { id:'overview',   label:'Overview',   icon:'⊙' },
    { id:'runs',       label:'Runs',       icon:'↻' },
    { id:'insights',   label:'Insights',   icon:'◈' },
    { id:'funnel',     label:'Funnel',     icon:'⬦' },
    { id:'dna',        label:'DNA',        icon:'◉' },
    { id:'guardrails', label:'Guardrails', icon:'◻' },
    { id:'settings',   label:'Settings',   icon:'⚙' },
  ]

  const AGENT_STEPS = [
    'Fetching repo',
    'Pulling analytics',
    'Scanning competitors',
    'Checking seasonal',
    'Reading Business DNA',
    'Mapping funnel',
    'Finding biggest issue',
    'Writing fix',
    'Opening pull request',
    'Sending notification',
  ]
  const inProgressIdx = AGENT_STEPS.length - 1 // last step (Sending notification) is blue / in-progress

  const kpis = [
    { label:'Total Runs',      value: total,            sub: 'All processed',     accent: false },
    { label:'Fixes Deployed',  value: deployed,         sub: '+1 this week',      accent: true  },
    { label:'Deploy Rate',     value: `${deployRate}%`, sub: 'On track',          accent: false },
    { label:'Avg. Bounce Δ',   value: avgDelta != null ? `−${avgDelta}%` : '—', sub:'After agent fixes', accent: false },
  ]

  const insights = [
    topDropOff && {
      icon:'⚠️', color:DC.yellow, bg:DC.yellowSoft, border:DC.yellowMid,
      label:'Biggest Drop-Off',
      value: topDropOff.page_path,
      sub: `${topDropOff.drop_off_score}% exit rate · ${topDropOff.views_7d} views/wk`,
      detail: 'Agent will prioritize this page next run',
    },
    bestRun && {
      icon:'📈', color:DC.green, bg:DC.greenSoft, border:DC.greenMid,
      label:'Most Improved',
      value: bestRun.analysis_result?.file_to_edit?.split('/').pop() || 'Last fix',
      sub: `Bounce −${Math.round(bestImpact.value_before-bestImpact.value_after)}% after deployment`,
      detail: '3 weeks ago',
    },
    avgConvNum != null && {
      icon:'💡', color:DC.accent, bg:DC.accentSoft, border:DC.accentMid,
      label:'Top Recommendation',
      value: runs[0]?.analysis_result?.problem?.slice(0,32) + '…',
      sub: `Est. impact: +${(Math.round(avgConvNum*10)/10)}% avg conversion`,
      detail: 'Based on last fix',
    },
    winRate != null && {
      icon:'🧠', color:DC.blue, bg:DC.blueSoft, border:DC.blueMid,
      label:'Agent Win Rate',
      value: `${winRate}%`,
      sub: `${positiveLearnings.length} of ${learnings.length} changes improved metrics`,
      detail: 'Business DNA learning',
    },
  ].filter(Boolean)

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff/3600000), d = Math.floor(h/24)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    return 'just now'
  }

  // Run history bar (oldest to latest)
  const last12 = [...runs].slice(0,12).reverse()

  return (
    <div className="dash-preview-shell" style={{
      display:'flex',
      width:'100%',
      background:DC.bg,
      border:`1px solid ${DC.border}`,
      borderRadius:16,
      overflow:'visible',
      fontFamily:'Jost,sans-serif',
      color:DC.text,
    }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
      <div className="dp-leftnav" style={{
        width:160, flexShrink:0, background:DC.bgCard,
        borderRight:`1px solid ${DC.border}`,
        display:'flex', flexDirection:'column',
      }}>
        <div style={{
          padding:'18px 14px 14px',
          display:'flex', alignItems:'center', gap:9,
          borderBottom:`1px solid ${DC.border}`,
        }}>
          <svg width={22} height={22} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke={DC.accent} strokeWidth="1" opacity="0.3"/>
            <circle cx="16" cy="16" r="8"  stroke={DC.accent} strokeWidth="1" opacity="0.55"/>
            <circle cx="16" cy="16" r="3"  fill={DC.accent}/>
            <line x1="16" y1="3"  x2="16" y2="8"  stroke={DC.accent} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
            <line x1="16" y1="24" x2="16" y2="29" stroke={DC.accent} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
            <line x1="3"  y1="16" x2="8"  y2="16" stroke={DC.accent} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
            <line x1="24" y1="16" x2="29" y2="16" stroke={DC.accent} strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
          </svg>
          <div>
            <p style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:17, color:DC.text, lineHeight:1 }}>Velyr</p>
            <p style={{ fontSize:9, color:DC.textLight, letterSpacing:'.06em', textTransform:'uppercase', marginTop:2 }}>Growth Agent</p>
          </div>
        </div>

        <nav style={{ padding:'10px 8px', flex:1 }}>
          {NAV_ITEMS.map(item => {
            const active = item.id === 'overview'
            return (
              <div key={item.id} style={{
                display:'flex', alignItems:'center', gap:9,
                padding:'8px 10px', borderRadius:7, marginBottom:2,
                background: active ? DC.accentSoft : 'transparent',
                color:      active ? DC.accent     : DC.textMuted,
                cursor:'default',
              }}>
                <span style={{ fontSize:13, flexShrink:0, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ fontSize:12, fontWeight: active ? 500 : 400 }}>{item.label}</span>
              </div>
            )
          })}
        </nav>

        <div style={{ padding:'12px 14px', borderTop:`1px solid ${DC.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:DC.accent, flexShrink:0 }}/>
            <div>
              <p style={{ fontSize:11, color:DC.text, fontWeight:400 }}>Agent active</p>
              <p style={{ fontSize:9, color:DC.textLight }}>Autonomous mode</p>
            </div>
          </div>
          <div style={{
            width:'100%', marginTop:8, padding:'6px',
            borderRadius:6, fontSize:10,
            background:'transparent', color:DC.textMuted,
            border:`1px solid ${DC.border}`,
            textAlign:'center', cursor:'default',
          }}>‖ Pause</div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div className="dp-main" style={{ flex:1, minWidth:0, padding:'22px 22px 24px' }}>

        {/* Page header */}
        <div style={{ marginBottom:18 }}>
          <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.accent, marginBottom:6 }}>Growth Agent Dashboard</p>
          <h1 style={{
            fontFamily:'Cormorant Garant, serif', fontWeight:400,
            fontSize:'clamp(22px,2.6vw,32px)', letterSpacing:'-.02em', lineHeight:1.1,
            color:DC.text, marginBottom:5,
          }}>
            Autonomous growth <em style={{ fontStyle:'italic', color:DC.accent }}>optimization.</em>
          </h1>
          <p style={{ fontSize:12, color:DC.textLight }}>Your agent analyzes, fixes and improves your website — continuously. · Auto-refreshes every 30s</p>
        </div>

        {/* Two-column: main column + right sidebar */}
        <div className="dp-overview-grid" style={{ display:'flex', gap:14, alignItems:'flex-start' }}>

          {/* Main column */}
          <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:12 }}>

            {/* KPI bar */}
            <div className="dp-kpis" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {kpis.map((k,i) => (
                <div key={i} style={{
                  background: k.accent ? DC.accentSoft : DC.bgCard,
                  border: `1px solid ${k.accent ? DC.accentMid : DC.border}`,
                  borderRadius:12, padding:'13px 14px',
                }}>
                  <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color: k.accent ? DC.accent : DC.textLight, marginBottom:7 }}>{k.label}</p>
                  <p style={{ fontFamily:'Cormorant Garant, serif', fontSize:28, fontWeight:400, color: k.accent ? DC.accent : DC.text, lineHeight:1, marginBottom:3 }}>{k.value}</p>
                  <p style={{ fontSize:10, color:DC.textLight, fontWeight:300 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Activity Stream + Top Insights */}
            <div className="dp-2col" style={{ display:'flex', flexDirection:'row', alignItems:'flex-start', gap:16 }}>

              {/* Activity Stream */}
              <div style={{ flex:'0 0 42%', minWidth:0, overflow:'hidden', background:DC.bgCard, border:`1px solid ${DC.border}`, borderRadius:12, padding:'14px 16px' }}>
                <div style={{ marginBottom:8 }}>
                  <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight, marginBottom:2 }}>Activity Stream</p>
                  <p style={{ fontSize:11, color:DC.textLight }}>Last actions taken</p>
                </div>
                <div>
                  {runs.map((run,i) => {
                    const s = STATUS_MAP[run.status] || STATUS_MAP.deployed
                    const a = run.analysis_result || {}
                    const file = a.file_to_edit?.split('/').pop()
                    return (
                      <div key={run.id} style={{
                        display:'flex', gap:10, alignItems:'flex-start',
                        padding:'9px 0',
                        borderBottom: i < runs.length-1 ? `1px solid ${DC.border}` : 'none',
                      }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:s.dot, marginTop:5, flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                            <p style={{ fontSize:11.5, color:DC.text, lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{a.problem}</p>
                            <span style={{ fontSize:10, color:DC.textLight, flexShrink:0 }}>{timeAgo(run.created_at)}</span>
                          </div>
                          {a.expected_improvement && (
                            <p style={{ fontSize:10, color:DC.green, marginTop:2 }}>Expected: {a.expected_improvement}</p>
                          )}
                          {file && (
                            <code style={{ fontSize:9.5, color:DC.accent, background:DC.accentSoft, padding:'1px 5px', borderRadius:3, marginTop:3, display:'inline-block', fontFamily:'DM Mono, monospace' }}>{file}</code>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Insights (2x2) */}
              <div style={{ flex:'0 0 55%', minWidth:0, display:'flex', flexDirection:'column', gap:8 }}>
                <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight }}>Top Insights</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, width:'100%', overflow:'visible' }}>
                  {insights.map((ins,i) => (
                    <div key={i} style={{
                      minWidth:0, overflow:'hidden', wordBreak:'break-word',
                      background:ins.bg, border:`1px solid ${ins.border}`,
                      borderRadius:10, padding:'11px 12px',
                    }}>
                      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ fontSize:14, flexShrink:0 }}>{ins.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', fontWeight:500, color:ins.color, marginBottom:3 }}>{ins.label}</p>
                          <p style={{ fontSize:11.5, fontWeight:500, color:DC.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }}>{ins.value}</p>
                          <p style={{ fontSize:10, color:DC.textMuted, lineHeight:1.4, marginBottom:3 }}>{ins.sub}</p>
                          <p style={{ fontSize:9, color:DC.textLight }}>{ins.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pages Analyzed */}
            <div style={{ background:DC.bgCard, border:`1px solid ${DC.border}`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight, marginBottom:2 }}>Pages Analyzed</p>
                  <p style={{ fontSize:11, color:DC.textLight }}>{funnelPages.length} pages · {funnelPages.filter(p => p.drop_off_score > 50).length} high-priority</p>
                </div>
                <span style={{ fontSize:11, color:DC.accent }}>Funnel ↗</span>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {funnelPages.map(p => {
                  const isHigh = p.drop_off_score > 50
                  const isMed  = !isHigh && p.drop_off_score > 30
                  return (
                    <div key={p.id} style={{
                      background: isHigh ? DC.redSoft  : isMed ? DC.yellowSoft : DC.accentSoft,
                      border: `1px solid ${isHigh ? DC.redMid : isMed ? DC.yellowMid : DC.accentMid}`,
                      borderRadius:6, padding:'5px 9px',
                      fontSize:10, color:DC.text, fontFamily:'DM Mono, monospace',
                      display:'flex', gap:6, alignItems:'center',
                    }}>
                      <span>{p.page_path}</span>
                      <span style={{ color: isHigh ? DC.red : isMed ? DC.yellow : DC.green, fontWeight:500 }}>{p.drop_off_score}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
          <div className="dp-rightsb" style={{ minWidth:180, maxWidth:200, flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>

            {/* Status / Next run / Steps / Pause */}
            <div style={{ background:DC.bgCard, border:`1px solid ${DC.border}`, borderRadius:12, overflow:'hidden' }}>
              <div style={{
                padding:'10px 14px', background:DC.accentSoft,
                borderBottom:`1px solid ${DC.accentMid}`,
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:DC.accent }}/>
                  <span style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.accent }}>Idle</span>
                </div>
                <span style={{ fontSize:10, color:DC.textLight, fontFamily:'DM Mono, monospace' }}>Growth Agent</span>
              </div>

              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${DC.border}` }}>
                <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight, marginBottom:8 }}>Next run in</p>
                <p style={{ fontFamily:'DM Mono, monospace', fontSize:20, color:DC.text, letterSpacing:'.02em', marginBottom:10 }}>6d 18h 40m</p>
                <div style={{ height:2, background:'rgba(42,92,69,0.1)', borderRadius:2, marginBottom:5 }}>
                  <div style={{ height:'100%', width:'12%', background:DC.accent, borderRadius:2 }}/>
                </div>
                <p style={{ fontSize:10, color:DC.textLight }}>Every Monday · 9:00 am</p>
              </div>

              <div style={{ padding:'12px 14px', borderBottom:`1px solid ${DC.border}` }}>
                <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight, marginBottom:10 }}>Last run · 18h ago</p>
                <div>
                  {AGENT_STEPS.map((step,i) => {
                    const current = i === inProgressIdx
                    const done    = !current
                    return (
                      <div key={step} style={{
                        display:'flex', gap:9, alignItems:'flex-start',
                        paddingBottom: i < AGENT_STEPS.length-1 ? 6 : 0,
                        position:'relative',
                      }}>
                        {i < AGENT_STEPS.length-1 && (
                          <div style={{
                            position:'absolute', left:7, top:15,
                            width:1, height:'calc(100% - 4px)',
                            background: done ? DC.accent : DC.border, opacity:0.3, zIndex:0,
                          }}/>
                        )}
                        <div style={{
                          width:15, height:15, borderRadius:'50%', flexShrink:0, zIndex:1,
                          background: current ? DC.blue : done ? DC.accent : 'rgba(26,25,22,0.07)',
                          border: `1px solid ${current ? DC.blue : done ? DC.accent : DC.border}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:8, color:'#fff',
                        }}>
                          {done && !current ? '✓' : ''}
                        </div>
                        <p style={{
                          fontSize:10.5, paddingTop:1,
                          color: current ? DC.blue : done ? DC.text : DC.textLight,
                          fontWeight: current ? 500 : 300,
                        }}>{step}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ padding:'10px 14px' }}>
                <div style={{
                  width:'100%', padding:'8px', borderRadius:7, fontSize:11,
                  background:'transparent', color:DC.textMuted,
                  border:`1px solid ${DC.border}`,
                  textAlign:'center', cursor:'default',
                }}>‖ Pause Agent</div>
              </div>
            </div>

            {/* Performance */}
            <div style={{ background:DC.bgCard, border:`1px solid ${DC.border}`, borderRadius:12, padding:'12px 14px' }}>
              <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight, marginBottom:10 }}>Performance</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                {[
                  { label:'Deploy rate',     value:`${deployRate}%`, color:DC.green },
                  { label:'Fixes merged',    value:deployed,         color:DC.accent },
                  { label:'Awaiting',        value:pendingCount,     color: pendingCount>0 ? DC.yellow : DC.textLight },
                  { label:'Failed/rejected', value:failedRejected,   color:DC.textLight },
                ].map((s,i) => (
                  <div key={i}>
                    <p style={{ fontFamily:'Cormorant Garant, serif', fontSize:22, fontWeight:400, color:s.color, lineHeight:1 }}>{s.value}</p>
                    <p style={{ fontSize:9, color:DC.textLight, marginTop:3 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight:500, color:DC.textLight, marginBottom:6 }}>Run history</p>
              <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:24 }}>
                {last12.map((run,i) => {
                  const s = STATUS_MAP[run.status] || STATUS_MAP.deployed
                  const h = run.status === 'deployed' ? 24
                          : run.status === 'waiting_approval' ? 16
                          : (run.status === 'failed' || run.status === 'rejected') ? 8
                          : 14
                  return (
                    <div key={run.id} style={{
                      flex:1, height:h, background:s.dot, borderRadius:2,
                      opacity: 0.4 + (i / last12.length) * 0.6,
                    }}/>
                  )
                })}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                <span style={{ fontSize:9, color:DC.textLight }}>oldest</span>
                <span style={{ fontSize:9, color:DC.textLight }}>latest</span>
              </div>
            </div>
          </div>
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

        <div className="tab-row" style={{ display:'flex', gap:0, marginBottom:32, background:'rgba(28,25,23,0.05)', borderRadius:12, padding:4, width:'fit-content', maxWidth:'100%' }}>
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
            <SubscribeButton type="full_scan" style={{ background:C.accent, width:'auto', display:'inline-flex', padding:'14px 28px', fontSize:14 }} />
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
              <SubscribeButton type="subscription" style={{ width:'auto', display:'inline-flex', padding:'12px 22px', fontSize:13, flexShrink:0 }} />
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
          <div className="pricing-card" style={{
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
          <div className="pricing-card" style={{
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

            <div style={{ background:'rgba(42,92,69,0.04)', border:'1px solid rgba(42,92,69,0.15)', borderRadius:12, padding:'16px', marginBottom:0 }}>
              <p style={{ fontSize:12, color:C.accent, fontWeight:400, marginBottom:4 }}>
                Website + social handles — all pulled automatically.
              </p>
              <p style={{ fontSize:11, color:C.textLight, fontWeight:300, marginBottom:12 }}>
                No manual numbers needed. We scrape your real data.
              </p>
              <SubscribeButton type="full_scan" style={{ borderRadius:9, padding:'13px', fontSize:14 }} />
              <p style={{ fontSize:11, color:C.textLight, textAlign:'center', marginTop:8, fontWeight:300 }}>No account · Results in ~60 seconds</p>
            </div>
          </div>

          {/* Growth Agent card */}
          <div className="pricing-card" style={{
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
              {['AI analyses your repo + analytics weekly','Identifies #1 conversion problem','Writes the code fix automatically','Opens a GitHub Pull Request','Reply YES or NO via Telegram','Auto-rollback if metrics drop','Revenue attribution (connect Stripe)','Competitor weekly scan','Brand Guardrails — your rules enforced','Full funnel analysis (all pages)','Multi-page sprint when root cause is shared','Weekly email summary','Monthly roast report — brutal honesty','Business DNA — learns over time','A/B testing automation','Public impact timeline (shareable)'].map((f,j) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13 }}>
                  <span style={{ color:'rgba(247,244,239,0.7)', flexShrink:0, marginTop:1 }}>✓</span>
                  <span style={{ color:'rgba(247,244,239,0.85)', fontWeight:300 }}>{f}</span>
                </div>
              ))}
            </div>
            <SubscribeButton type="subscription" style={{ background:'#f7f4ef', color:C.text, fontSize:15 }} />
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
    <footer className="footer" style={{ borderTop:`1px solid ${C.border}`, padding:'24px 24px', background:C.bg }}>
      <div className="footer-inner" style={{ maxWidth:1060, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Logo size={20} />
          <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:16, color:C.text }}>Velyr</span>
        </div>
        <p style={{ fontSize:13, color:C.textLight, fontWeight:300 }}>© 2026 Velyr · <a href="mailto:info@velyr.io" style={{ color:C.textLight, textDecoration:'none' }}>info@velyr.io</a></p>
        <div className="footer-links" style={{ display:'flex', gap:20 }}>
          {[
            { label:'FAQ', path:'/faq' },
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

export default function Home({ navigate, onScanStart, scrollToPricing }) {
  useEffect(() => {
    if (scrollToPricing) {
      setTimeout(() => {
        document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [scrollToPricing])

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