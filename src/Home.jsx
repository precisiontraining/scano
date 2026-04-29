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

function Hero({ onScanStart }) {
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [social, setSocial] = useState({
    tiktokFollowers:'', tiktokAvgViews:'', tiktokEngagement:'',
    igFollowers:'', igAvgLikes:'', igEngagement:'',
    ytSubscribers:'', ytAvgViews:'',
    twFollowers:'',
  })
  const [activePlatforms, setActivePlatforms] = useState([])
  const [error, setError] = useState('')

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

  const handleScan = () => {
    setError('')
    const manualSocial = buildManualSocial()
    onScanStart({ url, manualSocial })
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
              <button className="btn-primary" onClick={handleNext}>Continue → Add social numbers</button>
              <p style={{ fontSize:12, color:C.textLight, textAlign:'center', marginTop:2 }}>No account needed · Free forever</p>
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
              <p style={{ fontSize:12, color:C.textLight, textAlign:'center' }}>No account needed · Only fill in what you have</p>
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

// ─── Sample Report ────────────────────────────────────────────────────────────
// Mirrors the real Report.jsx layout exactly: benchmarks first, chips not bars,
// locked actions show title + blurred description, data-first throughout.

function SampleMiniBar({ label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
      <div style={{ width:100, fontSize:12, color:C.textMuted, fontWeight:300, flexShrink:0 }}>{label}</div>
      <div style={{ flex:1, height:4, background:'rgba(28,25,23,0.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value}%`, background:color, borderRadius:2, transition:'width 1.1s cubic-bezier(.4,0,.2,1)' }}/>
      </div>
      <div style={{ width:28, fontSize:12, color, fontWeight:500, textAlign:'right', fontFamily:'DM Mono, monospace' }}>{value}</div>
    </div>
  )
}

function SampleChip({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? 'rgba(42,92,69,0.06)' : '#fff',
      border: `1px solid ${accent ? 'rgba(42,92,69,0.2)' : 'rgba(28,25,23,0.08)'}`,
      borderRadius:10, padding:'11px 14px', flex:1, minWidth:80,
    }}>
      <div style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:C.textLight, fontWeight:400, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:17, fontFamily:'Cormorant Garant, serif', fontWeight:400, color:C.text, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color: accent ? C.accent : C.textLight, marginTop:2, fontWeight:300 }}>{sub}</div>}
    </div>
  )
}

function SampleCheckTag({ label, ok }) {
  return (
    <span style={{ fontSize:11, padding:'3px 9px', borderRadius:5, background: ok ? '#f2fdf5' : '#fdf2f2', color: ok ? '#1e8449' : '#c0392b', border:`1px solid ${ok ? '#a9dfbf' : '#f5c6c6'}` }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

function SampleBmRow({ platform, metric, yours, benchmark, diff, up, percentileLabel }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:10, alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(28,25,23,0.06)' }}>
      <div>
        <span style={{ fontSize:12, color:C.textMuted, fontWeight:300, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{platform} · {metric}</span>
        {percentileLabel && <span style={{ fontSize:10, color: up ? C.accent : C.red, fontWeight:400 }}>{percentileLabel}</span>}
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:14, fontWeight:500, fontFamily:'Cormorant Garant, serif', color:C.text }}>{yours}</div>
        <div style={{ fontSize:9, color:C.textLight, textTransform:'uppercase', letterSpacing:'.05em' }}>yours</div>
      </div>
      <div style={{ textAlign:'center' }}>
        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, background: up ? 'rgba(42,92,69,0.1)' : 'rgba(192,57,43,0.08)', color: up ? C.accent : C.red, fontWeight:500 }}>
          {up ? '↑' : '↓'} {diff}
        </span>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:12, color:C.textLight, fontWeight:300 }}>{benchmark}</div>
        <div style={{ fontSize:9, color:C.textLight, textTransform:'uppercase', letterSpacing:'.05em' }}>avg</div>
      </div>
    </div>
  )
}

function SampleReport() {
  const [ref, visible] = useReveal()

  const card = (children, delay, extraStyle = {}) => ({
    background:'#fff',
    border:'1px solid rgba(28,25,23,0.08)',
    borderRadius:16,
    padding:'24px 26px',
    marginBottom:12,
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(14px)',
    transition: `all .55s ease ${delay}s`,
    ...extraStyle,
  })

  const accentCard = (delay) => ({
    ...card(null, delay),
    border:'1px solid rgba(42,92,69,0.2)',
  })

  // Score ring SVG — 41/100 → dash = 41% of circumference (r=54, circ≈339)
  const r = 54, circ = 2 * Math.PI * r
  const dash = (41 / 100) * circ

  return (
    <section style={{ padding:'96px 24px', background:C.bg }}>
      <div style={{ maxWidth:1060, margin:'0 auto' }}>

        {/* Section heading */}
        <div ref={ref} className={`reveal ${visible ? 'in' : ''}`} style={{ marginBottom:48 }}>
          <p style={{ fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, marginBottom:14, fontWeight:400 }}>Sample output</p>
          <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(32px, 4vw, 52px)', letterSpacing:'-.02em', lineHeight:1.12 }}>
            This is what your report looks like.
          </h2>
          <p style={{ color:C.textMuted, marginTop:12, fontSize:16, fontWeight:300 }}>
            Real data. Benchmark comparisons. Specific fixes — not generic advice.
          </p>
        </div>

        {/* Two-column layout */}
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1.55fr)', gap:16, alignItems:'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div>

            {/* Score hero */}
            <div style={{ ...card(null, 0.1), display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, flexShrink:0 }}>
                <svg width="110" height="110" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(28,25,23,0.08)" strokeWidth="8"/>
                  <circle cx="70" cy="70" r={r} fill="none" stroke="#d68910" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${visible ? dash : 0} ${circ}`} strokeDashoffset={circ * 0.25}
                    style={{ transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1) 0.2s' }}/>
                  <text x="70" y="66" textAnchor="middle" fontFamily="Cormorant Garant, serif" fontSize="32" fontWeight="300" fill="#1c1917">41</text>
                  <text x="70" y="81" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="11" fontWeight="300" fill="#a09890" letterSpacing="2">/100</text>
                </svg>
                <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'#d68910', fontWeight:500 }}>Needs Work</span>
                <span style={{ fontSize:10, color:C.textMuted, textAlign:'center', maxWidth:110, lineHeight:1.4, fontWeight:300 }}>Slower than 73% of mobile pages</span>
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <p style={{ fontSize:13, fontWeight:500, color:'#d68910', marginBottom:7, lineHeight:1.4 }}>
                  At 41/100, you're losing 4 in 10 visitors before they read a single word.
                </p>
                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300 }}>
                  LCP of 6.1s is 3.6s over Google's threshold. TikTok engagement 63% below the fitness average. No CTA above the fold.
                </p>
              </div>
            </div>

            {/* Benchmarks */}
            <div style={{ ...accentCard(0.18), padding:0, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px 10px', borderBottom:'1px solid rgba(28,25,23,0.07)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.accent, fontWeight:500, marginBottom:2 }}>Market Benchmarks</p>
                  <p style={{ fontSize:11, color:C.textMuted, fontWeight:300 }}>vs. Fitness &amp; Health accounts</p>
                </div>
                <span style={{ fontSize:10, padding:'2px 9px', borderRadius:20, background:'rgba(42,92,69,0.08)', color:C.accent, fontWeight:500, letterSpacing:'.06em', textTransform:'uppercase' }}>Reference data</span>
              </div>
              <div style={{ padding:'4px 20px 10px' }}>
                <SampleBmRow platform="Website" metric="Mobile Speed" yours="27/100" benchmark="45/100" diff="18pts" up={false} percentileLabel="Slower than 73% of mobile pages" />
                <SampleBmRow platform="TikTok" metric="Engagement" yours="1.8%" benchmark="4.8%" diff="63%" up={false} percentileLabel="Worse than 68% of Fitness accounts" />
                <SampleBmRow platform="TikTok" metric="Avg. Views" yours="4,200" benchmark="15,000" diff="72%" up={false} percentileLabel="Worse than 71% of Fitness accounts" />
              </div>
            </div>

            {/* Score breakdown */}
            <div style={card(null, 0.24)}>
              <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:14 }}>Score Breakdown</p>
              <SampleMiniBar label="Performance"   value={27} color="#c0392b" />
              <SampleMiniBar label="SEO"           value={54} color="#d68910" />
              <SampleMiniBar label="Copy & UX"     value={35} color="#c0392b" />
              <SampleMiniBar label="Accessibility" value={81} color="#2a5c45" />
            </div>

            {/* Website chips */}
            <div style={card(null, 0.3)}>
              <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:12 }}>Website Performance</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                <SampleChip label="Performance" value="27/100" sub="mobile score" accent />
                <SampleChip label="LCP" value="6.1s" sub="target: <2.5s" />
                <SampleChip label="FCP" value="3.2s" sub="target: <1.8s" />
                <SampleChip label="CLS" value="0.04" sub="✓ good" />
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <SampleCheckTag label="HTTPS" ok={true} />
                <SampleCheckTag label="Mobile" ok={true} />
                <SampleCheckTag label="No popups" ok={false} />
                <SampleCheckTag label="Font size" ok={true} />
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div>

            {/* SEO */}
            <div style={card(null, 0.16)}>
              <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:12 }}>SEO Analysis</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                <SampleChip label="SEO Score" value="54/100" sub="our deep scan" />
                <SampleChip label="Title" value="38c" sub="✓ ideal length" />
                <SampleChip label="Meta desc" value="Missing" sub="✗ not found" />
                <SampleChip label="Alt coverage" value="60%" sub="6 missing" />
                <SampleChip label="H1 tags" value="2" sub="✗ too many" />
              </div>
              <div style={{ background:'rgba(28,25,23,0.03)', borderRadius:8, padding:'9px 12px', marginBottom:12, border:'1px solid rgba(28,25,23,0.07)' }}>
                <p style={{ fontSize:10, color:C.textLight, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>Page title</p>
                <p style={{ fontSize:13, color:C.text, fontWeight:300 }}>"strongcoach.io — Premium Online Coaching"</p>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <SampleCheckTag label="Canonical" ok={false} />
                <SampleCheckTag label="Open Graph" ok={true} />
                <SampleCheckTag label="Schema.org" ok={false} />
              </div>
            </div>

            {/* Copy & UX */}
            <div style={card(null, 0.22)}>
              <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500, marginBottom:12 }}>Copy &amp; UX</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                <SampleChip label="Copy Score" value="35/100" sub="out of 100" />
                <SampleChip label="Word count" value="312" sub="on page" />
              </div>
              <div style={{ background:'rgba(192,57,43,0.05)', borderRadius:8, padding:'11px 13px', marginBottom:12, border:'1px solid rgba(192,57,43,0.15)' }}>
                <p style={{ fontSize:10, color:C.textLight, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>Hero headline — ✗ not outcome-focused</p>
                <p style={{ fontSize:13, color:C.text, fontWeight:300, fontStyle:'italic' }}>"Premium Online Coaching for Serious Athletes"</p>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <SampleCheckTag label="Clear CTA" ok={false} />
                <SampleCheckTag label="Social proof" ok={false} />
                <SampleCheckTag label="Price visible" ok={false} />
                <SampleCheckTag label="Outcome headline" ok={false} />
              </div>
            </div>

            {/* Priority Actions */}
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10 }}>
                <p style={{ fontSize:10, letterSpacing:'.1em', textTransform:'uppercase', color:C.textLight, fontWeight:500 }}>Priority Actions</p>
                <p style={{ fontSize:11, color:C.textLight, fontWeight:300 }}>2 of 5 shown</p>
              </div>

              {/* Action 1 — visible */}
              <div style={{ background:'#fdf2f2', border:'1px solid #f5c6c6', borderRadius:12, padding:'16px 18px', marginBottom:10,
                opacity:visible?1:0, transform:visible?'none':'translateX(14px)', transition:'all .5s ease 0.3s' }}>
                <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'#c0392b', fontWeight:500, display:'block', marginBottom:4 }}>🔴 Critical</span>
                <p style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>LCP 6.1s — fix hero image to hit 2.5s</p>
                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300 }}>
                  Your LCP of 6.1s is 3.6s above Google's 2.5s threshold, putting you in the bottom 27% of mobile pages — compress your hero image to under 150kb and add <code style={{ fontFamily:'DM Mono, monospace', fontSize:11 }}>loading="eager"</code> to cut it to under 2s.
                </p>
              </div>

              {/* Action 2 — visible */}
              <div style={{ background:'#fdf2f2', border:'1px solid #f5c6c6', borderRadius:12, padding:'16px 18px', marginBottom:10,
                opacity:visible?1:0, transform:visible?'none':'translateX(14px)', transition:'all .5s ease 0.38s' }}>
                <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'#c0392b', fontWeight:500, display:'block', marginBottom:4 }}>🔴 Critical</span>
                <p style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>No CTA above the fold — visitors leave</p>
                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300 }}>
                  0 of your top 5 sections contain a button or link — sites with a visible CTA above the fold convert 3.5× better. Add one button in the first viewport with a benefit-led label like "Start your programme today."
                </p>
              </div>

              {/* Action 3 — locked: title visible, description blurred */}
              <div style={{ background:'#fefdf2', border:'1px solid #f5e6a3', borderRadius:12, padding:'16px 18px', marginBottom:10,
                opacity:visible?1:0, transform:visible?'none':'translateX(14px)', transition:'all .5s ease 0.46s' }}>
                <span style={{ fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'#d68910', fontWeight:500, display:'block', marginBottom:4 }}>🟡 Important</span>
                <p style={{ fontSize:13, fontWeight:500, color:C.text, marginBottom:4 }}>TikTok engagement 63% below fitness average</p>
                <p style={{ fontSize:12, color:C.textMuted, lineHeight:1.65, fontWeight:300, filter:'blur(4px)', userSelect:'none', pointerEvents:'none' }}>
                  Your 1.8% engagement rate vs. the 4.8% fitness benchmark means your hooks aren't landing. Analyse your top 3 videos — they average 4× your normal views. Reverse-engineer what the first 2 seconds do differently and apply it to every post.
                </p>
              </div>

              {/* Unlock block */}
              <div style={{ background:'#fff', border:'1px solid rgba(42,92,69,0.2)', borderRadius:16, padding:'28px 24px', textAlign:'center', marginTop:4,
                opacity:visible?1:0, transform:visible?'none':'translateY(10px)', transition:'all .5s ease 0.52s' }}>
                <div style={{ fontSize:20, marginBottom:10 }}>🔒</div>
                <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:20, letterSpacing:'-.015em', marginBottom:8, color:C.text }}>
                  Unlock the exact fixes — €9
                </h3>
                <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.7, fontWeight:300, marginBottom:16, maxWidth:340, margin:'0 auto 16px' }}>
                  You can see what's broken. The full report tells you exactly how to fix it — step by step, copy-paste ready.
                </p>
                <button
                  onClick={() => document.getElementById('scan-form')?.scrollIntoView({ behavior:'smooth' })}
                  style={{ background:C.text, color:C.bg, border:'none', borderRadius:9, padding:'12px 28px', fontSize:13, fontFamily:'Jost,sans-serif', fontWeight:500, cursor:'pointer', letterSpacing:'.02em', transition:'background .2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.accent}
                  onMouseLeave={e => e.currentTarget.style.background = C.text}
                >
                  Scan your site — it's free
                </button>
                <p style={{ fontSize:11, color:C.textLight, marginTop:10, fontWeight:300 }}>One-time · No subscription · Instant access</p>
              </div>
            </div>

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

export default function Home({ navigate, onScanStart, onScanComplete, onScanError }) {
  return (
    <>
      <style>{CSS}</style>
      <Nav navigate={navigate} />
      <Hero onScanStart={onScanStart} />
      <WhatWeCheck />
      <SampleReport />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer navigate={navigate} />
    </>
  )
}