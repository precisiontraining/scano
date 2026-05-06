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

function ComingSoonModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim() || !email.includes('@')) return
    setSending(true)
    try {
      await fetch('https://formsubmit.co/ajax/info@velyr.io', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, subject: 'Velyr — Full Report Waitlist', message: `New waitlist signup: ${email}` })
      })
    } catch (e) { /* silent fail */ }
    setSent(true)
    setSending(false)
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(28,25,23,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:20, padding:'36px 32px', maxWidth:420, width:'100%', position:'relative', boxShadow:'0 24px 80px rgba(28,25,23,0.18)' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:18, background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.textLight, lineHeight:1 }}>×</button>
        {!sent ? (
          <>
            <div style={{ fontSize:28, marginBottom:14 }}>🔒</div>
            <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:26, letterSpacing:'-.015em', marginBottom:8, color:C.text }}>Full reports coming soon</h3>
            <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.7, fontWeight:300, marginBottom:20 }}>
              We're finishing the payment setup. Leave your email and you'll be the first to know — plus an early-bird discount.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="your@email.com"
                style={{ width:'100%', padding:'13px 16px', border:'1px solid rgba(28,25,23,0.15)', borderRadius:10, fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:300, outline:'none', transition:'border-color .2s', color:C.text }}
                onFocus={e => e.target.style.borderColor='rgba(42,92,69,0.4)'}
                onBlur={e => e.target.style.borderColor='rgba(28,25,23,0.15)'}
              />
              <button onClick={handleSubmit} disabled={sending || !email.includes('@')} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:'13px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:sending?'not-allowed':'pointer', opacity:(!email.includes('@')||sending)?0.6:1, transition:'all .2s' }}>
                {sending ? 'Saving…' : "Notify me when it's live"}
              </button>
            </div>
            <p style={{ fontSize:11, color:C.textLight, textAlign:'center', marginTop:12, fontWeight:300 }}>No spam. Unsubscribe any time.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize:32, marginBottom:14 }}>✓</div>
            <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:26, letterSpacing:'-.015em', marginBottom:8, color:C.text }}>You're on the list</h3>
            <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.7, fontWeight:300, marginBottom:20 }}>We'll email you at <strong>{email}</strong> the moment full reports go live.</p>
            <button onClick={onClose} style={{ background:C.text, color:C.bg, border:'none', borderRadius:10, padding:'13px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', width:'100%', marginTop:18, transition:'background .2s' }}
              onMouseEnter={e=>e.target.style.background=C.accent}
              onMouseLeave={e=>e.target.style.background=C.text}
            >Run my free scan</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ navigate, openModal }) {
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
        <button className="nav-agent-link" onClick={() => document.getElementById('growth-agent')?.scrollIntoView({ behavior:'smooth' })}
          style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:C.textMuted, fontFamily:'Jost,sans-serif', fontWeight:300, letterSpacing:'.01em', transition:'color .2s', display:'flex', alignItems:'center', gap:6 }}
          onMouseEnter={e => e.currentTarget.style.color=C.accent}
          onMouseLeave={e => e.currentTarget.style.color=C.textMuted}
        >
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e', display:'inline-block' }} />
          Growth Agent
        </button>
        <div className="nav-ctas" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button className="nav-cta-ghost" onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' })} style={{
            background:'transparent', color:C.text, border:'1px solid rgba(28,25,23,0.15)', borderRadius:8,
            padding:'7px 16px', fontFamily:'Jost,sans-serif', fontWeight:400, fontSize:13,
            cursor:'pointer', transition:'all .2s',
          }}
            onMouseEnter={e => { e.target.style.borderColor='rgba(28,25,23,0.3)'; e.target.style.background='rgba(28,25,23,0.04)' }}
            onMouseLeave={e => { e.target.style.borderColor='rgba(28,25,23,0.15)'; e.target.style.background='transparent' }}
          >Free scan</button>
          <button onClick={openModal} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontFamily:'Jost,sans-serif', fontWeight:500, fontSize:13, cursor:'pointer', transition:'background .2s', letterSpacing:'.01em' }}
            onMouseEnter={e => e.target.style.background='#1e4433'}
            onMouseLeave={e => e.target.style.background=C.accent}
          >Full report — €9</button>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onScanStart }) {
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [social, setSocial] = useState({ tiktokFollowers:'', tiktokAvgViews:'', tiktokEngagement:'', igFollowers:'', igAvgLikes:'', igEngagement:'', ytSubscribers:'', ytAvgViews:'', twFollowers:'' })
  const [activePlatforms, setActivePlatforms] = useState([])
  const [error, setError] = useState('')

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

  const handleNext = () => {
    if (!url.trim()) { setError('Please enter your website URL.'); return }
    setError(''); setStep(2)
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

  return (
    <section className="hero-pad" style={{ paddingTop:120, paddingBottom:96, paddingLeft:24, paddingRight:24, position:'relative' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:500, backgroundImage:'repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(28,25,23,0.033) 59px, rgba(28,25,23,0.033) 60px)', pointerEvents:'none', maskImage:'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0.22) 82%, transparent 100%)' }} />
      <div style={{ maxWidth:580, margin:'0 auto', position:'relative' }}>
        <div style={{ animation:'fadeUp .5s ease both', marginBottom:28, display:'flex', alignItems:'center', gap:10 }}>
          <Logo size={16} />
          <span style={{ fontSize:11, fontWeight:400, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent }}>AI Business Audit & Growth Agent</span>
        </div>

        <h1 style={{ fontFamily:'Cormorant Garant, serif', fontSize:'clamp(40px, 7vw, 70px)', fontWeight:300, lineHeight:1.06, letterSpacing:'-.025em', color:C.text, marginBottom:22, animation:'fadeUp .6s .08s ease both' }}>
          Find out what's <em style={{ fontStyle:'italic', color:C.warm }}>actually</em><br />holding your business back.
        </h1>

        <p style={{ fontSize:17, color:C.textMuted, lineHeight:1.72, marginBottom:24, animation:'fadeUp .6s .16s ease both', fontWeight:300, maxWidth:460 }}>
          Scan your website and socials — get an instant AI audit with your score and specific fixes. Or let the Growth Agent fix it automatically every week.
        </p>

        {/* Product pills */}
        <div style={{ display:'flex', gap:8, marginBottom:32, animation:'fadeUp .6s .18s ease both', flexWrap:'wrap' }}>
          <span style={{ fontSize:12, background:'rgba(42,92,69,0.08)', border:'1px solid rgba(42,92,69,0.18)', borderRadius:20, padding:'5px 12px', color:C.accent, fontWeight:400 }}>
            ✓ Free audit — instant
          </span>
          <span style={{ fontSize:12, background:'rgba(28,25,23,0.05)', border:'1px solid rgba(28,25,23,0.1)', borderRadius:20, padding:'5px 12px', color:C.textMuted, fontWeight:300 }}>
            Full report — €9
          </span>
          <span style={{ fontSize:12, background:'rgba(28,25,23,0.05)', border:'1px solid rgba(28,25,23,0.1)', borderRadius:20, padding:'5px 12px', color:C.textMuted, fontWeight:300, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
            Growth Agent — €29/mo
          </span>
        </div>

        <div id="scan-form" className="scan-form" style={{ background:'#fff', border:'1px solid rgba(28,25,23,0.1)', borderRadius:18, padding:28, animation:'fadeUp .6s .24s ease both', boxShadow:'0 4px 32px rgba(28,25,23,0.07)' }}>
          {/* Step indicator */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:22 }}>
            {[{n:1,label:'Website'},{n:2,label:'Social (optional)'}].map(({n,label}) => (
              <div key={n} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:step>=n?C.accent:'transparent', border:`1px solid ${step>=n?C.accent:'rgba(28,25,23,0.15)'}`, fontSize:11, fontWeight:500, color:step>=n?'#fff':C.textLight, transition:'all .3s' }}>{n}</div>
                <span style={{ fontSize:12, color:step>=n?C.text:C.textLight, fontWeight:300, transition:'color .3s' }}>{label}</span>
                {n<2 && <div style={{ width:20, height:1, background:'rgba(28,25,23,0.12)', margin:'0 2px' }}/>}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🌐</span>
                <input className="inp" value={url} onChange={e => setUrl(e.target.value)} placeholder="yourwebsite.com" onKeyDown={e => e.key==='Enter' && handleNext()} />
              </div>
              {error && <p style={{ fontSize:13, color:'#c0392b', padding:'8px 12px', background:'rgba(192,57,43,0.06)', borderRadius:8 }}>{error}</p>}
              <div style={{ height:2 }} />
              <button className="btn-primary" onClick={handleNext}>Continue → Add social numbers</button>
              <p style={{ fontSize:12, color:C.textLight, textAlign:'center', marginTop:2 }}>No account needed · Free forever</p>
            </div>
          )}

          {step === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.6 }}>Select the platforms you're on and enter your numbers. Skip any you don't have.</p>
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
              {activePlatforms.length===0 && <p style={{ fontSize:13, color:C.textLight, fontStyle:'italic', textAlign:'center', padding:'6px 0' }}>No social media? No problem — we'll analyse your website only.</p>}
              {error && <p style={{ fontSize:13, color:'#c0392b', padding:'8px 12px', background:'rgba(192,57,43,0.06)', borderRadius:8 }}>{error}</p>}
              <div style={{ display:'flex', gap:8, marginTop:2 }}>
                <button onClick={() => setStep(1)} style={{ background:'none', border:'1px solid rgba(28,25,23,0.12)', borderRadius:10, padding:'14px 16px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:300, cursor:'pointer', color:C.textMuted, transition:'all .2s', flexShrink:0 }}>← Back</button>
                <button className="btn-primary" onClick={() => { setError(''); onScanStart({ url, manualSocial:buildManualSocial() }) }} style={{ flex:1 }}>Scan my business — it's free</button>
              </div>
              <p style={{ fontSize:12, color:C.textLight, textAlign:'center' }}>Only fill in what you have</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── What we check ─────────────────────────────────────────────────────────────
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
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:56 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>What we check</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>Every part of your online presence,<br />in one report.</h2>
        </div>
        <div className="what-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:2 }}>
          {items.map((item, i) => {
            const [cardRef, cardVisible] = useReveal(i * 80)
            const br = i===0 ? '14px 0 0 14px' : i===items.length-1 ? '0 14px 14px 0' : '0'
            return (
              <div key={i} ref={cardRef} className="what-card" style={{ padding:'38px 32px', background:'#fff', border:'1px solid rgba(28,25,23,0.07)', borderRadius:br, opacity:cardVisible?1:0, transform:cardVisible?'none':'translateY(16px)', transition:`all .55s ease ${i*.1}s` }}>
                <div style={{ fontSize:26, marginBottom:18 }}>{item.icon}</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:22, letterSpacing:'-.015em', marginBottom:12, color:C.text }}>{item.title}</h3>
                <p style={{ color:C.textMuted, lineHeight:1.75, fontSize:14.5, fontWeight:300 }}>{item.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Growth Agent Section (redesigned to match site theme) ────────────────────
function GrowthAgentSection({ navigate }) {
  const [ref, visible] = useReveal()

  const features = [
    { icon:'📊', title:'Data-driven fixes', desc:'The agent reads your real analytics — bounce rates, traffic sources, top pages — and uses that data to find the highest-impact improvement every week.' },
    { icon:'🔀', title:'Writes the code for you', desc:"It doesn't just tell you what to fix. It writes the actual code change, opens a Pull Request on GitHub, and waits for your approval." },
    { icon:'📱', title:'Approve from Telegram', desc:'You get a Telegram message every Monday with the problem, the solution, and the PR link. One reply to approve — done.' },
    { icon:'📈', title:'Tracks & learns', desc:'After each fix, the agent measures what changed. If bounce rate drops, it doubles down on that pattern. If a change hurts metrics, it auto-rolls back.' },
    { icon:'🛡️', title:'Brand Guardrails', desc:'Set rules the agent must follow — tone of voice, things it can never change, protected elements. Your brand stays consistent, always.' },
    { icon:'🗺️', title:'Full funnel awareness', desc:'The agent maps every page in your repo and their drop-off rates. It fixes the highest-leverage page, not just the homepage.' },
  ]

  const steps = [
    { time:'Monday 9am',   text:'Agent reads your analytics + scans your GitHub repo' },
    { time:'Minutes later', text:'Finds the #1 conversion problem across your full funnel' },
    { time:'Instantly',    text:'Writes the fix and opens a Pull Request with a preview' },
    { time:'You decide',   text:'Telegram message arrives — reply approve to ship it live' },
    { time:'Wednesday',    text:'Mid-week check: traffic update, bounce rate, social sources' },
    { time:'+48h',         text:'Auto-rollback triggers if bounce rate increases by 15%+' },
  ]

  return (
    <section id="growth-agent" style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>

        {/* Header */}
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div style={{ position:'relative', width:10, height:10 }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#22c55e', animation:'agentPing 2s ease-out infinite' }} />
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#22c55e' }} />
            </div>
            <span style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, fontWeight:400 }}>Growth Agent — New</span>
          </div>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 5vw, 60px)', letterSpacing:'-.025em', lineHeight:1.08, color:C.text, marginBottom:20 }}>
            Your website,<br />
            <em style={{ fontStyle:'italic', color:C.warm }}>always improving.</em>
          </h2>
          <p style={{ fontSize:17, color:C.textMuted, lineHeight:1.72, fontWeight:300, maxWidth:520 }}>
            A semi-autonomous AI agent that analyses your analytics, writes conversion fixes, and deploys them — with your approval. Every week, automatically.
          </p>
        </div>

        {/* Features grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:2, marginBottom:48 }}>
          {features.map((f, i) => {
            const isFirst = i === 0
            const isLast = i === features.length - 1
            const br = isFirst ? '14px 0 0 0' : isLast ? '0 0 14px 0' : '0'
            return (
              <div key={i} style={{
                background:'#fff',
                border:`1px solid ${C.border}`,
                borderRadius: features.length === 6
                  ? (i === 0 ? '14px 0 0 0' : i === 1 ? '0 14px 0 0' : i === 4 ? '0 0 0 14px' : i === 5 ? '0 0 14px 0' : '0')
                  : br,
                padding:'32px 28px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(16px)',
                transition: `all .55s ease ${i * 0.07}s`,
              }}>
                <div style={{ fontSize:24, marginBottom:16 }}>{f.icon}</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:20, color:C.text, marginBottom:10, letterSpacing:'-.01em' }}>{f.title}</h3>
                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.72, fontWeight:300 }}>{f.desc}</p>
              </div>
            )
          })}
        </div>

        {/* How it works + CTA side by side */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, alignItems:'start' }}>
          <div style={{
            background:'#fff', border:`1px solid ${C.border}`,
            borderRadius:16, padding:'32px 36px',
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(16px)',
            transition: 'all .6s ease .3s',
          }}>
            <p style={{ fontSize:11, letterSpacing:'.12em', textTransform:'uppercase', color:C.textLight, fontWeight:400, marginBottom:24 }}>How it works</p>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {steps.map((item, i) => (
                <div key={i} style={{
                  display:'flex', gap:20, alignItems:'flex-start',
                  paddingBottom: i < steps.length - 1 ? 18 : 0,
                  marginBottom: i < steps.length - 1 ? 18 : 0,
                  borderBottom: i < steps.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ width:110, flexShrink:0 }}>
                    <span style={{ fontSize:11, color:C.textLight, fontWeight:300, letterSpacing:'.03em' }}>{item.time}</span>
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:C.accent, flexShrink:0 }} />
                    <p style={{ fontSize:14, color:C.text, fontWeight:300, lineHeight:1.5 }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Stats */}
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

            {/* CTA card */}
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

// ─── Sample Report ─────────────────────────────────────────────────────────────
function SampleReport({ navigate, openModal }) {
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
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>This is what your report looks like.</h2>
          <p style={{ color:C.textMuted, marginTop:12, fontSize:15, fontWeight:300 }}>Real data. Benchmark comparisons. Specific fixes — not generic advice.</p>
        </div>

        <div className="tab-row" style={{ display:'flex', gap:0, marginBottom:32, background:'rgba(28,25,23,0.05)', borderRadius:12, padding:4, width:'fit-content' }}>
          {[{ key:'free', label:'Free scan' }, { key:'full', label:'★ Full report — €9' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background:tab===t.key?'#fff':'transparent',
              border:'none', borderRadius:9, padding:'9px 20px',
              fontFamily:'Jost,sans-serif', fontSize:13, fontWeight:tab===t.key?500:300,
              color:tab===t.key?(t.key==='full'?C.accent:C.text):C.textLight,
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
                <div style={{ fontSize:18, marginBottom:9 }}>🔒</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:20, letterSpacing:'-.015em', marginBottom:7, color:C.text }}>Get the full report — €9</h3>
                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.65, fontWeight:300, marginBottom:14, maxWidth:280, margin:'0 auto 14px' }}>All 5 issues, exact step-by-step fixes, deep social analysis, caption rewrites, and benchmarks.</p>
                <button onClick={() => setTab('full')} style={{ background:'rgba(42,92,69,0.08)', color:C.accent, border:'1px solid rgba(42,92,69,0.2)', borderRadius:8, padding:'8px 18px', fontSize:12, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', marginBottom:12, transition:'all .2s' }}>See full report sample ↓</button>
                <br />
                <button onClick={openModal} style={{ background:C.text, color:C.bg, border:'none', borderRadius:9, padding:'12px 24px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s' }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.accent}
                  onMouseLeave={e=>e.currentTarget.style.background=C.text}
                >Get my full report — €9</button>
                <p style={{ fontSize:11, color:C.textLight, marginTop:9, fontWeight:300 }}>One-time · No subscription · Instant</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'full' && (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <p style={{ fontSize:32, marginBottom:16 }}>📋</p>
            <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:32, letterSpacing:'-.02em', marginBottom:12, color:C.text }}>Full report includes everything.</h3>
            <p style={{ fontSize:15, color:C.textMuted, fontWeight:300, maxWidth:480, margin:'0 auto 32px', lineHeight:1.7 }}>All 5 priority actions with exact copy-paste fixes, deep social dive, hook analysis on every post, caption rewrites, brand clarity score, and an action plan by time required.</p>
            <button onClick={openModal} style={{ background:C.accent, color:'#fff', border:'none', borderRadius:10, padding:'14px 28px', fontSize:14, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='#1e4433'}
              onMouseLeave={e=>e.currentTarget.style.background=C.accent}
            >Get my full report — €9</button>
            <p style={{ fontSize:12, color:C.textLight, marginTop:10, fontWeight:300 }}>One-time payment · No subscription · Instant</p>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing({ navigate, openModal }) {
  const [ref, visible] = useReveal()

  const plans = [
    {
      name:'Free scan',
      price:'€0',
      note:'no account required',
      desc:'See where you stand.',
      features:[
        'Overall score 0–100',
        'Full website analysis (speed, SEO, copy)',
        'Social media stats & engagement rates',
        'Industry benchmark comparisons',
        'Your 2 most critical issues to fix',
        'No account needed — ever',
      ],
      cta:'Start for free',
      featured:false,
      action: () => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' }),
    },
    {
      name:'Full report',
      price:'€9',
      note:'one-time · no subscription',
      desc:'Everything you need to actually improve.',
      features:[
        'Everything in the free scan',
        'All 5 priority actions with exact fixes',
        'Deep social analysis on your focus platform',
        '  → Best posting times from your data',
        '  → Content mix & hook pattern breakdown',
        '  → Hashtag strategy analysis',
        'Hook quality analysis — post by post',
        'Caption & CTA rewrite suggestions',
        'Brand clarity score + specific improvements',
        { text:'Competitor comparison scan', soon:true },
        { text:'Score history — track progress', soon:true },
      ],
      cta:'Get full report — €9',
      featured:true,
      action: openModal,
    },
    {
      name:'Growth Agent',
      price:'€29',
      note:'per month · cancel anytime',
      desc:'Autonomous weekly improvements.',
      features:[
        'AI analyses your repo + analytics weekly',
        'Identifies #1 conversion problem',
        'Writes the code fix automatically',
        'Opens a GitHub Pull Request',
        'Approve or reject via Telegram',
        'Auto-rollback if metrics drop',
        'Brand Guardrails — your rules enforced',
        'Full funnel analysis (all pages)',
        'Weekly executive summary',
        'Competitor awareness',
        'Business DNA — learns over time',
        { text:'A/B testing automation', soon:false },
      ],
      cta:'Start Growth Agent',
      featured:false,
      accent:true,
      action: () => navigate('/agent/register'),
    },
  ]

  return (
    <section className="section-pad" style={{ background:C.bgSecond, borderTop:`1px solid ${C.border}`, padding:'96px 24px' }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:56 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>Pricing</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 52px)', letterSpacing:'-.02em' }}>Simple. No surprises.</h2>
        </div>
        <div className="pricing-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:16 }}>
          {plans.map((p, i) => (
            <div key={i} style={{
              background: p.accent ? C.accent : '#fff',
              border:`1px solid ${p.featured?'rgba(42,92,69,0.28)':p.accent?'transparent':'rgba(28,25,23,0.08)'}`,
              borderRadius:18, padding:32, position:'relative',
              opacity:visible?1:0, transform:visible?'none':'translateY(20px)',
              transition:`all .55s ease ${i*.12}s`,
              boxShadow:p.featured?'0 8px 40px rgba(42,92,69,0.1)':p.accent?'0 8px 40px rgba(42,92,69,0.25)':'none',
            }}>
              {p.featured && (
                <div style={{ position:'absolute', top:18, right:18, background:C.accent, color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:500, letterSpacing:'.05em' }}>Most popular</div>
              )}
              {p.accent && (
                <div style={{ position:'absolute', top:18, right:18, background:'rgba(247,244,239,0.2)', color:'#fff', borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:500, letterSpacing:'.05em', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />
                  Autonomous
                </div>
              )}
              <p style={{ fontWeight:500, fontSize:15, marginBottom:5, color:p.accent?'rgba(247,244,239,0.9)':C.text }}>{p.name}</p>
              <p style={{ color:p.accent?'rgba(247,244,239,0.6)':C.textLight, fontSize:13, fontWeight:300, marginBottom:20 }}>{p.desc}</p>
              <div style={{ marginBottom:4 }}>
                <span style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:52, letterSpacing:'-.03em', color:p.accent?'#fff':C.text }}>{p.price}</span>
              </div>
              <p style={{ color:p.accent?'rgba(247,244,239,0.5)':C.textLight, fontSize:12, marginBottom:26, fontWeight:300 }}>{p.note}</p>
              <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:28 }}>
                {p.features.map((f, j) => {
                  const isObj = typeof f === 'object'
                  const isIndented = typeof f === 'string' && f.startsWith('  →')
                  const text = isObj ? f.text : isIndented ? f.trim() : f
                  return (
                    <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:9, fontSize:13, paddingLeft:isIndented?16:0 }}>
                      <span style={{ color:isIndented?(p.accent?'rgba(247,244,239,0.4)':C.textLight):p.accent?'rgba(247,244,239,0.7)':p.featured?C.accent:C.textLight, flexShrink:0, marginTop:1, fontSize:isIndented?11:13 }}>{isIndented?'→':'✓'}</span>
                      <span style={{ color:isIndented?(p.accent?'rgba(247,244,239,0.5)':C.textLight):p.accent?'rgba(247,244,239,0.85)':C.textMuted, fontWeight:300, fontSize:isIndented?12:13 }}>
                        {text}
                        {isObj && f.soon && <span style={{ marginLeft:6, fontSize:10, background:'rgba(42,92,69,0.1)', color:C.accent, padding:'1px 6px', borderRadius:4, fontWeight:500, letterSpacing:'.04em', verticalAlign:'middle' }}>SOON</span>}
                      </span>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={p.action}
                style={{
                  background: p.accent ? '#f7f4ef' : p.featured ? C.text : 'transparent',
                  color: p.accent ? C.text : p.featured ? C.bg : C.text,
                  border: p.accent || p.featured ? 'none' : '1px solid rgba(28,25,23,0.18)',
                  borderRadius:10, padding:'14px 28px', fontSize:15,
                  fontFamily:'Jost,sans-serif', fontWeight:500,
                  cursor:'pointer', width:'100%', letterSpacing:'.03em',
                  transition:'all .2s',
                }}
                onMouseEnter={e => {
                  if (p.accent) { e.currentTarget.style.background='#fff'; }
                  else if (p.featured) { e.currentTarget.style.background=C.accent; }
                  else { e.currentTarget.style.background='rgba(28,25,23,0.03)'; e.currentTarget.style.borderColor='rgba(28,25,23,0.35)'; }
                  e.currentTarget.style.transform='translateY(-1px)';
                }}
                onMouseLeave={e => {
                  if (p.accent) { e.currentTarget.style.background='#f7f4ef'; }
                  else if (p.featured) { e.currentTarget.style.background=C.text; }
                  else { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='rgba(28,25,23,0.18)'; }
                  e.currentTarget.style.transform='none';
                }}
              >{p.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FAQ() {
  const [ref, visible] = useReveal()
  const [open, setOpen] = useState(null)

  const items = [
    // Free scan & report
    { q:'Do I need an account?', a:'No. You can scan your business and see your score without creating an account. The full report is a one-time €9 payment — no login, no subscription.' },
    { q:'Which platforms does Velyr support?', a:'Website, TikTok, Instagram, YouTube, X (Twitter), Facebook, and LinkedIn. You don\'t need all of them — just add what you have. For the full report you can pick one platform as your "focus" for a deeper analysis.' },
    { q:"Free vs. full report — what's the real difference?", a:'The free scan gives you your score, website analysis, social stats, benchmark comparisons, and your 2 most critical issues. The full report (€9, one-time) adds all 5 issues with exact copy-paste fixes, the deep social dive on your focus platform, hook-by-hook analysis of your posts, a caption rewrite, and brand clarity scoring.' },
    { q:'How accurate is the analysis?', a:"We use real scraped data from your profiles — actual engagement rates, real posts, real timestamps. The AI interprets this data and identifies patterns. It's not perfect, but it's based on what actually happens in your account, not generic advice." },

    // Growth Agent
    { q:'What is the Growth Agent?', a:'The Growth Agent is a semi-autonomous AI that runs every Monday. It reads your real PostHog analytics and your GitHub repo, finds the biggest conversion problem, writes the code fix, opens a Pull Request, and sends you a Telegram message to approve or reject — all automatically.' },
    { q:'Do I have to approve every change before it goes live?', a:'Yes, always. Nothing ships without your explicit approval. You receive a Telegram message with the problem, the data behind it, the solution, and the PR link. Reply "approve [id]" to merge it, or "reject [id]" to discard it.' },
    { q:"What happens if the agent's change makes things worse?", a:'The agent checks your bounce rate 48 hours after every deployment. If it increased by 15+ percentage points, it automatically creates a rollback PR, merges it, and notifies you via Telegram. Your site reverts without any manual work.' },
    { q:'What are Brand Guardrails?', a:'Brand Guardrails are rules you set in your dashboard that the agent must follow on every run. You can specify tone of voice (e.g. "friendly but direct"), things the agent can never do (e.g. "no clickbait headlines"), and elements it must never change (e.g. "brand colors", "logo placement"). Any suggestion that violates your guardrails is automatically rejected.' },
    { q:'What is the Full Funnel analysis?', a:'Instead of only looking at your homepage, the agent scans every page in your GitHub repo and maps the conversion funnel. It detects page types (landing, pricing, checkout, blog etc.), cross-references them with your real analytics, and identifies where visitors are dropping off. It then prioritises the highest-leverage page to fix — not always the homepage.' },
    { q:'What is Business DNA?', a:'Business DNA is the agent\'s memory. After each deployed change, the agent measures the outcome and saves a learning: "CTA copy changes increased conversions by 18% — double down" or "layout restructuring hurt bounce rate — avoid". Over time, the agent gets better at knowing what works specifically for your business.' },
    { q:'How does the Competitor Awareness feature work?', a:'You can add up to 2 competitor URLs in your Telegram bot. The agent scrapes their site every Monday — headlines, meta descriptions, CTAs, and key copy. It then factors that into its suggestion, specifically looking for differentiation opportunities where your site could stand out.' },
    { q:'What is the Weekly Executive Summary?', a:'Every Monday at 8am — one hour before the agent runs — you get a Telegram summary covering the past week: total traffic, bounce rate, traffic sources by platform, deployed changes, A/B test results, and impact metrics. A clean snapshot of everything without needing to open any dashboard.' },
    { q:'What is A/B testing automation?', a:'When the agent creates a fix, it optionally creates a PostHog feature flag that shows the change to 50% of visitors and keeps the original for the other 50%. After one week, it evaluates which version performed better, saves the learning to Business DNA, and notifies you via Telegram with the result.' },
    { q:'Is my data safe?', a:'Yes. Your data is only used to run the agent and generate your reports. We never sell or share it. The agent only has read access to your analytics and write access to your GitHub repo via a dedicated GitHub App installation — which you can revoke at any time.' },
  ]

  return (
    <section className="section-pad" style={{ padding:'96px 24px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        <div ref={ref} className={`reveal ${visible?'in':''}`} style={{ marginBottom:48 }}>
          <p style={{ fontSize:11, letterSpacing:'.14em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>FAQ</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(30px, 4vw, 48px)', letterSpacing:'-.02em' }}>Questions you might have.</h2>
        </div>

        {/* Section dividers in FAQ */}
        {[
          { label:'Free Scan & Full Report', indices:[0,1,2,3] },
          { label:'Growth Agent', indices:[4,5,6,7,8,9,10,11,12,13] },
        ].map(section => (
          <div key={section.label} style={{ marginBottom:40 }}>
            <p style={{ fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:2, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>{section.label}</p>
            {section.indices.map(i => {
              const item = items[i]
              return (
                <div key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <button onClick={() => setOpen(open===i?null:i)} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'19px 0', textAlign:'left' }}>
                    <span style={{ fontWeight:400, fontSize:15, color:C.text, paddingRight:16 }}>{item.q}</span>
                    <span style={{ color:C.textLight, fontSize:20, lineHeight:1, flexShrink:0, transition:'transform .25s', transform:open===i?'rotate(45deg)':'none', display:'block' }}>+</span>
                  </button>
                  <div style={{ maxHeight:open===i?400:0, overflow:'hidden', transition:'max-height .35s cubic-bezier(.4,0,.2,1)' }}>
                    <p style={{ color:C.textMuted, fontSize:14.5, lineHeight:1.75, fontWeight:300, paddingBottom:20 }}>{item.a}</p>
                  </div>
                </div>
              )
            })}
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
        <button onClick={() => window.scrollTo({ top:0, behavior:'smooth' })} style={{ background:C.bg, color:C.text, border:'none', borderRadius:10, padding:'15px 32px', fontFamily:'Jost,sans-serif', fontWeight:500, fontSize:15, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s', display:'inline-block' }}
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
          {[{ label:'Privacy Policy', path:'/privacy' }, { label:'Impressum', path:'/impressum' }].map(l => (
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
  const [showModal, setShowModal] = useState(false)
  const openModal = () => setShowModal(true)

  return (
    <>
      <style>{CSS}</style>
      {showModal && <ComingSoonModal onClose={() => setShowModal(false)} />}
      <Nav navigate={navigate} openModal={openModal} />
      <Hero onScanStart={onScanStart} />
      <WhatWeCheck />
      <GrowthAgentSection navigate={navigate} />
      <SampleReport navigate={navigate} openModal={openModal} />
      <Pricing navigate={navigate} openModal={openModal} />
      <FAQ />
      <FinalCTA />
      <Footer navigate={navigate} />
    </>
  )
}