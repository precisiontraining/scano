import { useState, useEffect } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
  @keyframes spin   { to { transform:rotate(360deg); } }
  .unlock-blur { filter:blur(5px); user-select:none; pointer-events:none; opacity:0.45; }
`

const C = {
  bg:'#f7f4ef', text:'#1c1917', muted:'#6b6460', light:'#a09890',
  border:'rgba(28,25,23,0.08)', accent:'#2a5c45', white:'#ffffff',
}

const sev = {
  critical: { color:'#c0392b', bg:'#fdf2f2', label:'🔴 Critical',  border:'#f5c6c6' },
  important:{ color:'#d68910', bg:'#fefdf2', label:'🟡 Important', border:'#f5e6a3' },
  quickwin: { color:'#1e8449', bg:'#f2fdf5', label:'🟢 Quick Win', border:'#a9dfbf' },
}

function ScoreRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r, dash = (score / 100) * circ
  const color = score >= 70 ? '#2a5c45' : score >= 40 ? '#d68910' : '#c0392b'
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ display:'block' }}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(28,25,23,0.08)" strokeWidth="8"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
        style={{ transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}/>
      <text x="70" y="66" textAnchor="middle" fontFamily="Cormorant Garant, serif" fontSize="32" fontWeight="300" fill="#1c1917">{score}</text>
      <text x="70" y="82" textAnchor="middle" fontFamily="Jost, sans-serif" fontSize="11" fontWeight="300" fill="#a09890" letterSpacing="2">/100</text>
    </svg>
  )
}

function MetricBar({ label, value }) {
  const pct = Math.round(value)
  const color = pct >= 70 ? '#2a5c45' : pct >= 40 ? '#d68910' : '#c0392b'
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:13, color:C.muted, fontWeight:300 }}>{label}</span>
        <span style={{ fontSize:13, color, fontWeight:400 }}>{pct}%</span>
      </div>
      <div style={{ height:4, background:'rgba(28,25,23,0.08)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:2, transition:'width 1s cubic-bezier(0.4,0,0.2,1)' }}/>
      </div>
    </div>
  )
}

function StatChip({ label, value }) {
  return (
    <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 18px', flex:1, minWidth:100 }}>
      <div style={{ fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:C.light, marginBottom:6, fontWeight:400 }}>{label}</div>
      <div style={{ fontSize:20, fontFamily:'Cormorant Garant, serif', fontWeight:400, color:C.text }}>{value}</div>
    </div>
  )
}

function ActionCard({ issue }) {
  const cfg = sev[issue.severity] || sev.quickwin
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:12, padding:'20px 24px' }}>
      <span style={{ fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:cfg.color, fontWeight:400, display:'block', marginBottom:6 }}>{cfg.label}</span>
      <p style={{ fontSize:15, fontWeight:400, color:C.text, marginBottom:6 }}>{issue.title}</p>
      <p style={{ fontSize:14, color:C.muted, lineHeight:1.7, fontWeight:300 }}>{issue.description}</p>
    </div>
  )
}

function UnlockBlock() {
  return (
    <div style={{ position:'relative', marginTop:8, background:'linear-gradient(to bottom, rgba(247,244,239,0) 0%, #f7f4ef 38%)', padding:'80px 0 0', textAlign:'center' }}>
      <div style={{ background:C.white, border:'1px solid rgba(42,92,69,0.2)', borderRadius:18, padding:'40px 32px', boxShadow:'0 8px 40px rgba(42,92,69,0.09)' }}>
        <div style={{ fontSize:26, marginBottom:14 }}>🔒</div>
        <h3 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:26, letterSpacing:'-.015em', marginBottom:10, color:C.text }}>
          3 more actions in your full report
        </h3>
        <p style={{ fontSize:15, color:C.muted, lineHeight:1.72, fontWeight:300, maxWidth:400, margin:'0 auto 28px' }}>
          The full report includes every priority action, hook-by-hook content feedback, engagement benchmarks compared to accounts your size, and a complete brand clarity breakdown.
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:9, maxWidth:360, margin:'0 auto 32px', textAlign:'left' }}>
          {[
            'All 5 priority actions with exact fixes',
            'Hook quality analysis — post by post',
            'Engagement benchmarks vs. similar accounts',
            'Caption & CTA feedback',
            'Brand clarity score with specific improvements',
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
              <span style={{ color:C.accent, fontSize:13, marginTop:2, flexShrink:0 }}>✓</span>
              <span style={{ fontSize:14, color:C.muted, fontWeight:300 }}>{item}</span>
            </div>
          ))}
        </div>
        <button style={{
          background:C.text, color:C.bg, border:'none', borderRadius:10,
          padding:'15px 36px', fontSize:15, fontFamily:'Jost, sans-serif',
          fontWeight:500, cursor:'pointer', letterSpacing:'.02em',
          transition:'background .2s, transform .15s',
          width:'100%', maxWidth:320, display:'block', margin:'0 auto 12px',
        }}
          onMouseEnter={e => e.currentTarget.style.background = C.accent}
          onMouseLeave={e => e.currentTarget.style.background = C.text}
        >
          Unlock full report — €9
        </button>
        <p style={{ fontSize:12, color:C.light, fontWeight:300 }}>One-time payment · No subscription · Instant access</p>
      </div>
    </div>
  )
}

export default function Report({ navigate, scanData, reportData, websiteUrl }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  if (!scanData || !reportData) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
          <div style={{ width:32, height:32, border:'2px solid rgba(28,25,23,0.15)', borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <p style={{ fontSize:14, color:C.light, fontFamily:'Jost, sans-serif', fontWeight:300 }}>Loading your report…</p>
        </div>
      </>
    )
  }

  const { score, website, tiktok, instagram, youtube } = scanData
  const { headline, summary, websiteAnalysis, socialAnalysis, topIssues } = reportData
  const scoreColor = score >= 70 ? '#2a5c45' : score >= 40 ? '#d68910' : '#c0392b'
  const scoreLabel = score >= 70 ? 'Strong' : score >= 40 ? 'Needs Work' : 'Critical Issues'
  const visibleActions = topIssues?.slice(0, 2) || []
  const lockedActions  = topIssues?.slice(2)    || []
  const a = (d) => ({ animation: visible ? `fadeUp 0.6s ease ${d}s forwards` : 'none', opacity:0 })

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:'100vh', background:C.bg }}>

        <nav style={{ borderBottom:`1px solid ${C.border}`, padding:'0 40px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(247,244,239,0.95)', position:'sticky', top:0, zIndex:100 }}>
          <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:'Cormorant Garant, serif', fontWeight:500, fontSize:20, color:C.text }}>Scano</button>
          <button onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:C.light, fontFamily:'Jost, sans-serif', fontWeight:300, transition:'color .2s' }}
            onMouseEnter={e => e.target.style.color = C.text} onMouseLeave={e => e.target.style.color = C.light}>← New scan</button>
        </nav>

        <div style={{ maxWidth:760, margin:'0 auto', padding:'56px 24px 96px' }}>

          <div style={{ marginBottom:48, ...a(0) }}>
            <p style={{ fontSize:12, letterSpacing:'.12em', textTransform:'uppercase', color:C.accent, marginBottom:12, fontWeight:400 }}>Free Audit Report</p>
            <h1 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:300, fontSize:'clamp(24px,4vw,42px)', letterSpacing:'-.02em', lineHeight:1.1, marginBottom:8 }}>{websiteUrl}</h1>
            <p style={{ fontSize:13, color:C.light }}>{new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
          </div>

          {/* Score */}
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:'40px', marginBottom:20, display:'flex', gap:40, alignItems:'center', flexWrap:'wrap', ...a(0.1) }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <ScoreRing score={score} />
              <span style={{ fontSize:12, letterSpacing:'.08em', textTransform:'uppercase', color:scoreColor, fontWeight:400 }}>{scoreLabel}</span>
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              <h2 style={{ fontFamily:'Cormorant Garant, serif', fontWeight:400, fontSize:22, letterSpacing:'-.01em', marginBottom:12, lineHeight:1.3 }}>{headline}</h2>
              <p style={{ fontSize:15, color:C.muted, lineHeight:1.75, fontWeight:300 }}>{summary}</p>
            </div>
          </div>

          {/* Website */}
          {website && (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:'32px', marginBottom:20, ...a(0.2) }}>
              <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:C.light, marginBottom:20, fontWeight:400 }}>Website</p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
                <StatChip label="Performance" value={`${website.performanceScore}`} />
                <StatChip label="SEO" value={`${website.seoScore}`} />
                <StatChip label="Accessibility" value={`${website.accessibilityScore}`} />
                <StatChip label="LCP" value={website.coreWebVitals.lcp} />
              </div>
              <MetricBar label="Performance" value={website.performanceScore} />
              <MetricBar label="SEO" value={website.seoScore} />
              <MetricBar label="Accessibility" value={website.accessibilityScore} />
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', margin:'20px 0' }}>
                {[{label:'HTTPS',ok:website.technical.hasHttps},{label:'Meta Title',ok:website.technical.metaTitle},{label:'Meta Desc',ok:website.technical.metaDescription},{label:'Mobile',ok:website.technical.mobileOptimized}].map(({label,ok}) => (
                  <span key={label} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, background:ok?'#f2fdf5':'#fdf2f2', color:ok?'#1e8449':'#c0392b', border:`1px solid ${ok?'#a9dfbf':'#f5c6c6'}` }}>
                    {ok?'✓':'✗'} {label}
                  </span>
                ))}
              </div>
              <p style={{ fontSize:14, color:C.muted, lineHeight:1.75, fontWeight:300 }}>{websiteAnalysis}</p>
            </div>
          )}

          {/* Social */}
          {(tiktok || instagram || youtube) && (
            <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:16, padding:'32px', marginBottom:20, ...a(0.3) }}>
              <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:C.light, marginBottom:20, fontWeight:400 }}>Social Media</p>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
                {tiktok    && <StatChip label="TikTok Followers" value={tiktok.followers.toLocaleString()} />}
                {tiktok    && <StatChip label="Avg Views"        value={tiktok.avgViews.toLocaleString()} />}
                {instagram && <StatChip label="IG Followers"     value={instagram.followers.toLocaleString()} />}
                {instagram && <StatChip label="IG Engagement"    value={`${instagram.engagementRate}%`} />}
                {youtube   && <StatChip label="YT Subscribers"   value={youtube.subscribers.toLocaleString()} />}
              </div>
              <p style={{ fontSize:14, color:C.muted, lineHeight:1.75, fontWeight:300 }}>{socialAnalysis}</p>
            </div>
          )}

          {/* Priority Actions */}
          <div style={{ ...a(0.4) }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:16 }}>
              <p style={{ fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color:C.light, fontWeight:400 }}>Priority Actions</p>
              <p style={{ fontSize:12, color:C.light, fontWeight:300 }}>2 of {topIssues?.length || 5} shown</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {visibleActions.map((issue, i) => <ActionCard key={i} issue={issue} />)}
            </div>
            {lockedActions.length > 0 && (
              <div style={{ position:'relative', marginTop:12 }}>
                <div className="unlock-blur" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {lockedActions.map((issue, i) => <ActionCard key={i} issue={issue} />)}
                </div>
                <UnlockBlock />
              </div>
            )}
          </div>

          <div style={{ marginTop:56, textAlign:'center', ...a(0.5) }}>
            <button onClick={() => navigate('/')}
              style={{ background:'none', border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 28px', fontSize:13, fontFamily:'Jost, sans-serif', fontWeight:300, cursor:'pointer', color:C.muted, transition:'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(28,25,23,0.3)'; e.currentTarget.style.color=C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted }}
            >← Run another scan</button>
          </div>
        </div>

        <div style={{ borderTop:`1px solid ${C.border}`, padding:'24px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <span style={{ fontSize:13, color:C.light, fontWeight:300 }}>© 2026 Scano</span>
          <div style={{ display:'flex', gap:20 }}>
            <button onClick={() => navigate('/privacy')}   style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:C.light, fontFamily:'Jost, sans-serif', fontWeight:300 }}>Privacy Policy</button>
            <button onClick={() => navigate('/impressum')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:C.light, fontFamily:'Jost, sans-serif', fontWeight:300 }}>Impressum</button>
          </div>
        </div>
      </div>
    </>
  )
}