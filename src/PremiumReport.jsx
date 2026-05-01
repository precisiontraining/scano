import { useState, useEffect } from 'react'

const C = {
  bg: '#f7f4ef', text: '#1c1917', muted: '#6b6460', light: '#a09890',
  border: 'rgba(28,25,23,0.08)', accent: '#2a5c45', white: '#ffffff',
  red: '#c0392b', yellow: '#d68910', green: '#1e8449',
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (max-width:600px) {
    .pr-pad { padding: 24px 16px 72px !important; }
    .pr-nav { padding: 0 16px !important; }
    .pr-chips { flex-wrap: wrap !important; }
    .pr-chip { flex: 1 1 calc(50% - 4px) !important; min-width: 0 !important; }
    .effort-grid { grid-template-columns: 1fr !important; }
    .rewrite-grid { grid-template-columns: 1fr !important; }
    .hook-grid { grid-template-columns: 1fr !important; }
  }
`

const sev = {
  critical:  { color: '#c0392b', bg: '#fdf2f2', label: '🔴 Critical',  border: '#f5c6c6' },
  important: { color: '#d68910', bg: '#fefdf2', label: '🟡 Important', border: '#f5e6a3' },
  quickwin:  { color: '#1e8449', bg: '#f2fdf5', label: '🟢 Quick Win', border: '#a9dfbf' },
}

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

function ScoreRing({ score }) {
  const r = 54, circ = 2 * Math.PI * r, dash = ((score || 0) / 100) * circ
  const color = score >= 70 ? C.accent : score >= 40 ? C.yellow : C.red
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

function MiniBar({ label, value }) {
  const color = value >= 70 ? C.green : value >= 40 ? C.yellow : C.red
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 120, fontSize: 12, color: C.muted, fontWeight: 300, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: 'rgba(28,25,23,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 1.1s cubic-bezier(0.4,0,0.2,1)' }}/>
      </div>
      <div style={{ width: 36, fontSize: 12, color, fontWeight: 400, textAlign: 'right' }}>{value}</div>
    </div>
  )
}

function Chip({ label, value, sub, accent }) {
  return (
    <div className="pr-chip" style={{ background: accent ? 'rgba(42,92,69,0.06)' : C.white, border: `1px solid ${accent ? 'rgba(42,92,69,0.2)' : C.border}`, borderRadius: 10, padding: '11px 14px', flex: 1, minWidth: 90 }}>
      <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.light, marginBottom: 4, fontWeight: 400 }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: accent ? C.accent : C.light, marginTop: 2, fontWeight: 300 }}>{sub}</div>}
    </div>
  )
}

function Card({ children, delay = 0, visible, accent = false, style = {} }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${accent ? 'rgba(42,92,69,0.2)' : C.border}`,
      borderRadius: 16, padding: '24px 28px', marginBottom: 16,
      opacity: 0, animation: visible ? `fadeUp 0.6s ease ${delay}s forwards` : 'none',
      ...style
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: C.light, fontWeight: 500, marginBottom: 16 }}>{children}</p>
}

function ActionCard({ issue }) {
  const cfg = sev[issue.severity] || sev.quickwin
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 10 }}>
      <span style={{ fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase', color: cfg.color, fontWeight: 500, display: 'block', marginBottom: 5 }}>{cfg.label}</span>
      <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 5 }}>{issue.title}</p>
      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, fontWeight: 300 }}>{issue.description}</p>
    </div>
  )
}

function ShareButton({ reportId }) {
  const [copied, setCopied] = useState(false)
  // Only build a shareable URL once the UUID is saved — before that the
  // /premium/report path is in-memory only and can't be shared.
  const url = reportId
    ? `${window.location.origin}/premium/${reportId}`
    : null

  const copy = async () => {
    if (!url) return
    try { await navigator.clipboard.writeText(url) } catch { const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t) }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  if (!url) {
    return (
      <button disabled style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'transparent', color: C.light, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 18px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'not-allowed', marginTop: 16, opacity: 0.5 }}>
        ↗ Saving report…
      </button>
    )
  }

  return (
    <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 7, background: copied ? C.accent : C.white, color: copied ? C.white : C.text, border: `1px solid ${copied ? C.accent : C.border}`, borderRadius: 9, padding: '9px 18px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer', transition: 'all .2s', marginTop: 16 }}>
      {copied ? '✓ Link copied!' : '↗ Share this report'}
    </button>
  )
}

export default function PremiumReport({ navigate, scanData, reportData, websiteUrl, reportId, scanError, onRetry }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setTimeout(() => setVisible(true), 100) }, [])

  if (scanError) {
    return (
      <>
        <style>{CSS}</style>
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: '40px 24px', fontFamily: 'Jost, sans-serif', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fdf2f2', border: '1px solid #f5c6c6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>✗</div>
          <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 28, color: C.text, letterSpacing: '-.02em' }}>Something went wrong</h2>
          <p style={{ fontSize: 14, color: C.muted, fontWeight: 300, maxWidth: 360, lineHeight: 1.7 }}>
            {scanError.code === 'unreachable'
              ? `We couldn't reach ${websiteUrl}. Check the URL is correct and the site is live.`
              : 'Something went wrong during the scan. This is usually temporary — please try again.'}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {onRetry && (
              <button onClick={onRetry} style={{ background: C.text, color: C.bg, border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.accent}
                onMouseLeave={e => e.currentTarget.style.background = C.text}
              >Try again</button>
            )}
            <button onClick={() => navigate('/premium')} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 24px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer', color: C.muted, transition: 'all .2s' }}>
              ← Back to form
            </button>
          </div>
        </div>
      </>
    )
  }

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
  const { headline, summary, websiteAnalysis, copyAnalysis, copyRewrite, brandClarity, socialAnalysis, hookAnalysis, captionRewrite, topIssues, effortPlan } = reportData

  const scoreColor = score >= 70 ? C.accent : score >= 40 ? C.yellow : C.red
  const scoreLabel = score >= 70 ? 'Strong' : score >= 40 ? 'Needs Work' : 'Critical Issues'
  const hasSocial = tiktok || instagram || youtube || twitter

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg }}>

        {/* Nav */}
        <nav className="pr-nav" style={{ borderBottom: `1px solid ${C.border}`, padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={22}/>
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, background: 'rgba(42,92,69,0.08)', padding: '4px 10px', borderRadius: 6 }}>Full Report</span>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.light, fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>← New scan</button>
          </div>
        </nav>

        <div className="pr-pad" style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 96px' }}>

          {/* Header */}
          <div style={{ marginBottom: 36, opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0s forwards' : 'none' }}>
            <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 10, fontWeight: 500 }}>Full Audit Report{benchmarkData?.industryLabel ? ` · ${benchmarkData.industryLabel}` : ''}</p>
            <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(18px,4vw,34px)', letterSpacing: '-.02em', lineHeight: 1.1, marginBottom: 6, wordBreak: 'break-word' }}>{websiteUrl}</h1>
            <p style={{ fontSize: 12, color: C.light }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <ShareButton reportId={reportId}/>
          </div>

          {/* Score Hero */}
          <Card delay={0.08} visible={visible} accent>
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <ScoreRing score={score}/>
                <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: scoreColor, fontWeight: 500 }}>{scoreLabel}</span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: scoreColor, marginBottom: 10, lineHeight: 1.45 }}>{headline}</p>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, fontWeight: 300 }}>{summary}</p>
              </div>
            </div>
          </Card>

          {/* Effort Plan */}
          {effortPlan?.length > 0 && (
            <Card delay={0.12} visible={visible} accent>
              <SectionLabel>Your action plan</SectionLabel>
              <div className="effort-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {effortPlan.map((step, i) => (
                  <div key={i} style={{ background: i === 0 ? 'rgba(42,92,69,0.05)' : 'rgba(28,25,23,0.03)', border: `1px solid ${i === 0 ? 'rgba(42,92,69,0.2)' : 'rgba(28,25,23,0.07)'}`, borderRadius: 12, padding: '16px 18px' }}>
                    <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: i === 0 ? C.accent : C.light, fontWeight: 500, marginBottom: 8 }}>{step.timeframe}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>{step.action}</p>
                    <p style={{ fontSize: 12, color: C.muted, fontWeight: 300, lineHeight: 1.5 }}>{step.impact}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Score Breakdown */}
          <Card delay={0.16} visible={visible}>
            <SectionLabel>Score breakdown</SectionLabel>
            {website        && <MiniBar label="Website speed"   value={website.performanceScore}/>}
            {content?.seo   && <MiniBar label="SEO"             value={content.seo.score}/>}
            {content?.copy  && <MiniBar label="Copy & message"  value={content.copy.score}/>}
            {website        && <MiniBar label="Accessibility"    value={website.accessibilityScore}/>}
            <p style={{ fontSize: 12, color: C.light, marginTop: 12, fontWeight: 300, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              Your overall score weighs all areas together — a strong SEO score alone won't make up for a slow site or weak messaging.
            </p>
          </Card>

          {/* All 5 Priority Actions */}
          {topIssues?.length > 0 && (
            <div style={{ opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0.2s forwards' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <p style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: C.light, fontWeight: 500 }}>All priority actions</p>
                <p style={{ fontSize: 11, color: C.light, fontWeight: 300 }}>{topIssues.length} of {topIssues.length} shown</p>
              </div>
              {topIssues.map((issue, i) => <ActionCard key={i} issue={issue}/>)}
            </div>
          )}

          {/* Website Analysis */}
          {(website || content) && (
            <Card delay={0.26} visible={visible}>
              <SectionLabel>Website performance</SectionLabel>
              {website && (
                <div className="pr-chips" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                  <Chip label="Speed score"    value={`${website.performanceScore}/100`} sub="mobile" accent/>
                  <Chip label="Accessibility"  value={`${website.accessibilityScore}/100`}/>
                  <Chip label="Load time"      value={website.coreWebVitals.lcp}         sub="target: <2.5s"/>
                  <Chip label="Appears in"     value={website.coreWebVitals.fcp}         sub="target: <1.8s"/>
                  <Chip label="Layout jumps"   value={website.coreWebVitals.cls}         sub="target: <0.1"/>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: websiteAnalysis ? 14 : 0 }}>
                {website && <>
                  <span title="Your site uses HTTPS — visitor data is encrypted" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: website.technical.hasHttps ? '#f2fdf5' : '#fdf2f2', color: website.technical.hasHttps ? C.green : C.red, border: `1px solid ${website.technical.hasHttps ? '#a9dfbf' : '#f5c6c6'}`, cursor: 'help' }}>{website.technical.hasHttps ? '✓' : '✗'} Secure (HTTPS)</span>
                  <span title="Site adapts to phone screens — 60%+ of visitors are on mobile" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: website.technical.mobileOptimized ? '#f2fdf5' : '#fdf2f2', color: website.technical.mobileOptimized ? C.green : C.red, border: `1px solid ${website.technical.mobileOptimized ? '#a9dfbf' : '#f5c6c6'}`, cursor: 'help' }}>{website.technical.mobileOptimized ? '✓' : '✗'} Mobile-friendly</span>
                  <span title="Popups that block content on mobile cause Google to rank your site lower" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: website.technical.noIntrusive ? '#f2fdf5' : '#fdf2f2', color: website.technical.noIntrusive ? C.green : C.red, border: `1px solid ${website.technical.noIntrusive ? '#a9dfbf' : '#f5c6c6'}`, cursor: 'help' }}>{website.technical.noIntrusive ? '✓' : '✗'} No intrusive popups</span>
                </>}
              </div>
              {websiteAnalysis && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, fontWeight: 300, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>{websiteAnalysis}</p>}
            </Card>
          )}

          {/* Copy Rewrite */}
          {(copyRewrite || copyAnalysis) && (
            <Card delay={0.3} visible={visible} accent>
              <SectionLabel>Your copy — rewritten</SectionLabel>
              {copyAnalysis && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, fontWeight: 300, marginBottom: 20 }}>{copyAnalysis}</p>}
              {copyRewrite && (
                <div className="rewrite-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(192,57,43,0.04)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 12, padding: '16px 18px' }}>
                    <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.red, fontWeight: 500, marginBottom: 8 }}>Before</p>
                    {copyRewrite.headlineOriginal && <p style={{ fontSize: 14, color: C.text, fontStyle: 'italic', marginBottom: copyRewrite.ctaOriginal ? 10 : 0, lineHeight: 1.4 }}>"{copyRewrite.headlineOriginal}"</p>}
                    {copyRewrite.ctaOriginal && <span style={{ display: 'inline-block', fontSize: 12, padding: '5px 12px', background: 'rgba(28,25,23,0.08)', borderRadius: 6, color: C.muted, marginTop: 6 }}>{copyRewrite.ctaOriginal}</span>}
                  </div>
                  <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 12, padding: '16px 18px' }}>
                    <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 8 }}>After</p>
                    {copyRewrite.headlineRewritten && <p style={{ fontSize: 14, color: C.text, fontWeight: 500, marginBottom: copyRewrite.ctaRewritten ? 10 : 0, lineHeight: 1.4 }}>"{copyRewrite.headlineRewritten}"</p>}
                    {copyRewrite.ctaRewritten && <span style={{ display: 'inline-block', fontSize: 12, padding: '5px 12px', background: C.accent, borderRadius: 6, color: '#fff', marginTop: 6 }}>{copyRewrite.ctaRewritten}</span>}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Brand Clarity */}
          {brandClarity && (
            <Card delay={0.34} visible={visible}>
              <SectionLabel>Brand clarity</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 42, fontWeight: 300, color: brandClarity.score >= 7 ? C.accent : brandClarity.score >= 5 ? C.yellow : C.red, lineHeight: 1 }}>{brandClarity.score}</span>
                  <span style={{ fontSize: 16, color: C.light }}>/10</span>
                </div>
                <p style={{ fontSize: 14, color: C.text, fontWeight: 400, lineHeight: 1.5 }}>{brandClarity.verdict}</p>
              </div>
              {brandClarity.improvement && (
                <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.15)', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 13, color: C.muted, fontWeight: 300, lineHeight: 1.6 }}>💡 {brandClarity.improvement}</p>
                </div>
              )}
            </Card>
          )}

          {/* Social Media */}
          {hasSocial && (
            <Card delay={0.38} visible={visible}>
              <SectionLabel>Social media{benchmarkData?.industryLabel ? ` · ${benchmarkData.industryLabel}` : ''}</SectionLabel>
              {(benchmarkData?.tiktokIsNewAccount || benchmarkData?.instagramIsNewAccount) && (
                <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.15)', borderRadius: 8, padding: '9px 14px', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: C.accent, fontWeight: 300, lineHeight: 1.55 }}>🌱 <strong style={{ fontWeight: 500 }}>New account detected.</strong> Benchmarks are based on established accounts — low numbers at this stage are normal. Focus on consistency over the next 90 days.</p>
                </div>
              )}
              <div className="pr-chips" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {tiktok    && <Chip label="TikTok followers"  value={tiktok.followers?.toLocaleString()}    sub={`${tiktok.engagementRate ?? '?'}% interaction`}/>}
                {tiktok    && <Chip label="Avg views"         value={tiktok.avgViews?.toLocaleString()}     sub="per video"/>}
                {instagram && <Chip label="IG followers"      value={instagram.followers?.toLocaleString()} sub={`${instagram.engagementRate ?? '?'}% interaction`}/>}
                {instagram && <Chip label="Avg likes"         value={instagram.avgLikes?.toLocaleString()}  sub="per post"/>}
                {youtube   && <Chip label="Subscribers"       value={youtube.subscribers?.toLocaleString()} sub="YouTube"/>}
                {twitter   && <Chip label="X followers"       value={twitter.followers?.toLocaleString()}/>}
              </div>
              {benchmarkData?.benchmarks?.length > 0 && (
                <div style={{ marginBottom: socialAnalysis ? 16 : 0 }}>
                  {benchmarkData.benchmarks.map((b, i) => {
                    const isAbove = b.direction === 'above'
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(28,25,23,0.06)' }}>
                        <div>
                          <span style={{ fontSize: 12, color: C.muted, fontWeight: 300, display: 'block' }}>{b.platform} · {b.metric}</span>
                          {b.percentileLabel && <span style={{ fontSize: 11, color: isAbove ? C.accent : C.red, fontWeight: 400 }}>{b.percentileLabel}</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 500, fontFamily: 'Cormorant Garant, serif', color: C.text }}>{b.yours}</div>
                          <div style={{ fontSize: 9, color: C.light, textTransform: 'uppercase' }}>yours</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: isAbove ? 'rgba(42,92,69,0.1)' : 'rgba(192,57,43,0.08)', color: isAbove ? C.accent : C.red, fontWeight: 500 }}>{isAbove ? '↑' : '↓'} {b.diff}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: C.light, fontWeight: 300 }}>{b.benchmark}</div>
                          <div style={{ fontSize: 9, color: C.light, textTransform: 'uppercase' }}>avg</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {socialAnalysis && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, fontWeight: 300, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>{socialAnalysis}</p>}
            </Card>
          )}

          {/* Hook Analysis */}
          {hookAnalysis?.length > 0 && (
            <Card delay={0.42} visible={visible}>
              <SectionLabel>Hook analysis — post by post</SectionLabel>
              <div className="hook-grid" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {hookAnalysis.map((h, i) => (
                  <div key={i} style={{ background: h.verdict === 'works' ? 'rgba(42,92,69,0.04)' : 'rgba(28,25,23,0.03)', border: `1px solid ${h.verdict === 'works' ? 'rgba(42,92,69,0.15)' : 'rgba(28,25,23,0.08)'}`, borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: h.verdict === 'works' ? C.accent : C.muted, fontWeight: 500 }}>{h.platform === 'tiktok' ? '🎵 TikTok' : '📸 Instagram'} · {h.verdict === 'works' ? '✓ Working' : 'Needs work'}</span>
                      <span style={{ fontSize: 11, color: C.light, fontFamily: 'DM Mono, monospace' }}>{(h.views || h.likes || 0).toLocaleString()} {h.views ? 'views' : 'likes'}</span>
                    </div>
                    {h.caption && <p style={{ fontSize: 12, color: C.muted, fontStyle: 'italic', marginBottom: 10, fontWeight: 300 }}>"{h.caption}"</p>}
                    <p style={{ fontSize: 13, color: C.text, fontWeight: 400, marginBottom: 4 }}>{h.reason}</p>
                    <p style={{ fontSize: 12, color: C.accent, fontWeight: 300, lineHeight: 1.5 }}>→ {h.improvement}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Caption Rewrite */}
          {captionRewrite && (
            <Card delay={0.46} visible={visible} accent>
              <SectionLabel>Caption rewrite</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'rgba(192,57,43,0.04)', border: '1px solid rgba(192,57,43,0.15)', borderRadius: 12, padding: '16px 18px' }}>
                  <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.red, fontWeight: 500, marginBottom: 8 }}>Original {captionRewrite.platform === 'tiktok' ? 'TikTok' : 'Instagram'} caption</p>
                  <p style={{ fontSize: 13, color: C.muted, fontWeight: 300, lineHeight: 1.65, fontStyle: 'italic' }}>"{captionRewrite.original}"</p>
                </div>
                <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 12, padding: '16px 18px' }}>
                  <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 8 }}>Rewritten — use this instead</p>
                  <p style={{ fontSize: 13, color: C.text, fontWeight: 400, lineHeight: 1.65 }}>{captionRewrite.rewritten}</p>
                  {captionRewrite.explanation && <p style={{ fontSize: 12, color: C.muted, marginTop: 10, fontWeight: 300, fontStyle: 'italic' }}>{captionRewrite.explanation}</p>}
                </div>
              </div>
            </Card>
          )}

          {/* SEO Details */}
          {content?.seo && (
            <Card delay={0.5} visible={visible}>
              <SectionLabel>SEO details</SectionLabel>
              <div className="pr-chips" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <Chip label="SEO score"     value={`${content.seo.score}/100`}/>
                <Chip label="Title length"  value={`${content.seo.titleLength}c`} sub={content.seo.titleLength >= 30 && content.seo.titleLength <= 65 ? '✓ good' : '✗ off (30–65)'}/>
                <Chip label="Description"  value={content.seo.metaDesc ? `${content.seo.metaDescLength}c` : 'Missing'} sub={content.seo.metaDesc ? (content.seo.metaDescLength >= 120 && content.seo.metaDescLength <= 160 ? '✓ good' : '✗ off (120–160)') : '✗ missing'}/>
                <Chip label="Image labels"  value={`${content.seo.imgAltScore}%`} sub={`${content.seo.imgsWithoutAlt} missing`}/>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span title="Duplicate page protection" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: content.seo.canonicalPresent ? '#f2fdf5' : '#fdf2f2', color: content.seo.canonicalPresent ? C.green : C.red, border: `1px solid ${content.seo.canonicalPresent ? '#a9dfbf' : '#f5c6c6'}`, cursor: 'help' }}>{content.seo.canonicalPresent ? '✓' : '✗'} No duplicate pages</span>
                <span title="Controls how your page looks when shared on social media" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: content.seo.ogTitlePresent ? '#f2fdf5' : '#fdf2f2', color: content.seo.ogTitlePresent ? C.green : C.red, border: `1px solid ${content.seo.ogTitlePresent ? '#a9dfbf' : '#f5c6c6'}`, cursor: 'help' }}>{content.seo.ogTitlePresent ? '✓' : '✗'} Social sharing preview</span>
                <span title="Helps Google show extra info like ratings in search results" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: content.seo.structuredData ? '#f2fdf5' : '#fdf2f2', color: content.seo.structuredData ? C.green : C.red, border: `1px solid ${content.seo.structuredData ? '#a9dfbf' : '#f5c6c6'}`, cursor: 'help' }}>{content.seo.structuredData ? '✓' : '✗'} Rich search results</span>
              </div>
              {content.seo.title && (
                <div style={{ background: 'rgba(28,25,23,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 8, border: '1px solid rgba(28,25,23,0.07)' }}>
                  <p style={{ fontSize: 10, color: C.light, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 3 }}>Page title</p>
                  <p style={{ fontSize: 13, color: C.text, fontWeight: 300 }}>"{content.seo.title}"</p>
                </div>
              )}
            </Card>
          )}

          {/* Footer CTA */}
          <div style={{ marginTop: 52, textAlign: 'center', opacity: 0, animation: visible ? 'fadeUp 0.6s ease 0.56s forwards' : 'none' }}>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 16, fontWeight: 300 }}>Want to track your progress as you fix these issues?</p>
            <button onClick={() => navigate('/premium')}
              style={{ background: C.text, color: C.bg, border: 'none', borderRadius: 10, padding: '13px 28px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'background .2s' }}
              onMouseEnter={e => e.currentTarget.style.background = C.accent}
              onMouseLeave={e => e.currentTarget.style.background = C.text}
            >Run another full audit</button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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