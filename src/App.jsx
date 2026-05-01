import { useState, useEffect, useRef } from 'react'
import Home from './Home.jsx'
import Report from './pages/Report.jsx'
import Impressum from './pages/Impressum.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import PremiumScanForm from './PremiumScanForm.jsx'
import PremiumReport from './PremiumReport.jsx'

const UUID_REGEX         = /^\/report\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i
const PREMIUM_UUID_REGEX = /^\/premium\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i

const CSS_SCANNER = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; }

  @keyframes radarSweep  { from { transform: rotate(0deg);   } to { transform: rotate(360deg); } }
  @keyframes ringPulse1  { 0%, 100% { opacity: 0.18; } 50%  { opacity: 0.38; } }
  @keyframes ringPulse2  { 0%, 100% { opacity: 0.32; } 50%  { opacity: 0.6;  } }
  @keyframes dotGlow     { 0%, 100% { r: 5; opacity: 1; }   50% { r: 7; opacity: 0.5; } }
  @keyframes tickSeq     { 0%, 100% { opacity: 0.25; }      50% { opacity: 0.85; } }
  @keyframes pingRing    { 0%   { transform: scale(1);   opacity: 0.5; }
                           100% { transform: scale(2.2); opacity: 0;   } }
  @keyframes fadeIn      { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes stepFade    { from { opacity: 0; transform: translateX(5px); } to { opacity: 1; transform: none; } }

  .live-row { animation: fadeIn 0.4s ease forwards; opacity: 0; }
  .phase-label { animation: stepFade 0.35s ease both; }
`

function perfLabel(score) {
  if (score == null) return null
  const slower = Math.round(100 - score)
  return `slower than ~${slower}% of mobile pages`
}

function RadarLogo() {
  const ticks = [
    { x1: 80, y1: 10,  x2: 80, y2: 22  },
    { x1: 80, y1: 138, x2: 80, y2: 150 },
    { x1: 10, y1: 80,  x2: 22, y2: 80  },
    { x1: 138,y1: 80,  x2: 150,y2: 80  },
  ]
  return (
    <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 40px' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 270deg, rgba(42,92,69,0) 0deg, rgba(42,92,69,0.08) 45deg, rgba(42,92,69,0.18) 90deg, rgba(42,92,69,0) 90deg)', animation: 'radarSweep 3.5s linear infinite' }} />
      <div style={{ position: 'absolute', inset: 16, borderRadius: '50%', border: '1px solid rgba(42,92,69,0.35)', animation: 'pingRing 3.5s linear infinite' }} />
      <svg viewBox="0 0 160 160" width="160" height="160" style={{ position: 'absolute', inset: 0 }} fill="none">
        <circle cx="80" cy="80" r="70" stroke="#2a5c45" strokeWidth="1" style={{ animation: 'ringPulse1 3.5s ease-in-out infinite' }} />
        <circle cx="80" cy="80" r="45" stroke="#2a5c45" strokeWidth="1" style={{ animation: 'ringPulse2 3.5s ease-in-out 0.4s infinite' }} />
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2a5c45" strokeWidth="1.2" strokeLinecap="round" style={{ animation: `tickSeq 3.5s ease-in-out ${i * 0.875}s infinite` }} />
        ))}
        <g style={{ animation: 'radarSweep 3.5s linear infinite', transformOrigin: '80px 80px' }}>
          <line x1="80" y1="80" x2="80" y2="10" stroke="#2a5c45" strokeWidth="1" strokeLinecap="round" opacity="0.9" />
          <circle cx="80" cy="14" r="1.5" fill="#2a5c45" opacity="0.7" />
        </g>
        <circle cx="80" cy="80" r="5" fill="#2a5c45" style={{ animation: 'dotGlow 1.8s ease-in-out infinite' }} />
        <circle cx="80" cy="80" r="2.5" fill="#f7f4ef" opacity="0.6" />
      </svg>
    </div>
  )
}

function ScanningScreen({ url, liveData }) {
  const [phaseKey, setPhaseKey] = useState(0)

  const phase = (() => {
    if (liveData.report === 'generating') return 'Writing your personalised report…'
    if (liveData.copy   != null) return 'Running benchmark comparisons…'
    if (liveData.seo    != null) return 'Analysing copy & conversion signals…'
    if (liveData.perf   != null) return 'Scanning SEO & metadata…'
    return 'Scanning website performance…'
  })()

  const progress = (() => {
    if (liveData.report === 'done')       return 100
    if (liveData.report === 'generating') return 80
    if (liveData.copy   != null)          return 60
    if (liveData.seo    != null)          return 40
    if (liveData.perf   != null)          return 25
    return 8
  })()

  const prevPhase = useRef(phase)
  useEffect(() => {
    if (phase !== prevPhase.current) { prevPhase.current = phase; setPhaseKey(k => k + 1) }
  }, [phase])

  const rows = []
  if (liveData.perf != null) {
    const label = perfLabel(liveData.perf.performanceScore)
    rows.push({ key: 'perf', icon: liveData.perf.performanceScore >= 70 ? '🟢' : liveData.perf.performanceScore >= 40 ? '🟡' : '🔴', text: `Performance: ${liveData.perf.performanceScore}/100${label ? ` — ${label}` : ''}` })
    if (liveData.perf.coreWebVitals?.lcp) rows.push({ key: 'lcp', icon: '⏱', text: `LCP: ${liveData.perf.coreWebVitals.lcp} — load speed of your largest element` })
  }
  if (liveData.seo != null) rows.push({ key: 'seo', icon: liveData.seo.score >= 70 ? '🟢' : liveData.seo.score >= 40 ? '🟡' : '🔴', text: `SEO: ${liveData.seo.score}/100 — ${liveData.seo.issues.length > 0 ? `${liveData.seo.issues.length} issue${liveData.seo.issues.length > 1 ? 's' : ''} found` : 'no major issues'}` })
  if (liveData.copy != null) rows.push({ key: 'copy', icon: liveData.copy.score >= 70 ? '🟢' : liveData.copy.score >= 40 ? '🟡' : '🔴', text: `Copy & UX: ${liveData.copy.score}/100 — ${liveData.copy.hasCTA ? 'CTA found' : 'no CTA detected'}${liveData.copy.isOutcomeFocused ? ', outcome-focused headline' : ', headline not outcome-focused'}` })
  if (liveData.benchmarkLabel) rows.push({ key: 'industry', icon: '📊', text: `Industry: ${liveData.benchmarkLabel} — comparing against benchmarks` })
  if (liveData.social) {
    const s = liveData.social
    if (s.tiktok)    rows.push({ key: 'tiktok', icon: '📱', text: `TikTok: ${s.tiktok?.engagementRate ?? '?'}% engagement — running benchmark comparison` })
    if (s.instagram) rows.push({ key: 'ig',     icon: '📸', text: `Instagram: ${s.instagram.followers?.toLocaleString()} followers — running benchmark comparison` })
  }
  if (liveData.report === 'generating') rows.push({ key: 'ai', icon: '🤖', text: 'Generating AI analysis with benchmark context…' })

  return (
    <>
      <style>{CSS_SCANNER}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Jost, sans-serif', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 18, color: '#1c1917', marginBottom: 44, letterSpacing: '-.01em' }}>Scano</p>
          <RadarLogo />
          <p style={{ fontSize: 12, color: '#a09890', fontWeight: 300, marginBottom: 20, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '.01em' }}>{url}</p>
          <p key={phaseKey} className="phase-label" style={{ fontSize: 13, color: '#2a5c45', fontWeight: 300, letterSpacing: '.03em', marginBottom: 16, textAlign: 'center' }}>{phase}</p>
          <div style={{ width: '100%', height: 2, background: 'rgba(28,25,23,0.07)', borderRadius: 2, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ height: '100%', background: '#2a5c45', borderRadius: 2, width: `${progress}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          {rows.length > 0 && (
            <div style={{ width: '100%', background: '#ffffff', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 14, padding: '4px 0' }}>
              {rows.map((row, i) => (
                <div key={row.key} className="live-row" style={{ animationDelay: `${i * 0.06}s`, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 18px', borderBottom: i < rows.length - 1 ? '1px solid rgba(28,25,23,0.05)' : 'none' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.5 }}>{row.icon}</span>
                  <span style={{ fontSize: 13, color: '#6b6460', fontWeight: 300, lineHeight: 1.5 }}>{row.text}</span>
                </div>
              ))}
            </div>
          )}
          {rows.length === 0 && (
            <div style={{ width: '100%', background: '#ffffff', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 14, padding: '28px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#a09890', fontWeight: 300, animation: 'ringPulse1 1.8s ease infinite' }}>Connecting to your website…</p>
            </div>
          )}
          <p style={{ fontSize: 11, color: '#a09890', marginTop: 20, fontWeight: 300, letterSpacing: '.04em' }}>Usually 15–25 seconds</p>
        </div>
      </div>
    </>
  )
}

const Spinner = () => (
  <div style={{ minHeight: '100vh', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Jost, sans-serif' }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    <div style={{ width: 32, height: 32, border: '2px solid rgba(28,25,23,0.15)', borderTopColor: '#2a5c45', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <p style={{ fontSize: 14, color: '#a09890', fontWeight: 300 }}>Loading report…</p>
  </div>
)

export default function App() {
  const [path, setPath]               = useState(window.location.pathname)
  const [scanData, setScanData]       = useState(null)
  const [reportData, setReportData]   = useState(null)
  const [websiteUrl, setWebsiteUrl]   = useState('')
  const [reportId, setReportId]       = useState(null)
  const [loading, setLoading]         = useState(false)
  const [scanError, setScanError]     = useState(null)
  const [retryFn, setRetryFn]         = useState(null)
  const [scanning, setScanning]       = useState(false)
  const [scanningUrl, setScanningUrl] = useState('')
  const [liveData, setLiveData]       = useState({})

  // ── Premium state ────────────────────────────────────────────────────────────
  const [premiumScanData, setPremiumScanData]     = useState(null)
  const [premiumReportData, setPremiumReportData] = useState(null)
  const [premiumWebsiteUrl, setPremiumWebsiteUrl] = useState('')
  const [premiumReportId, setPremiumReportId]     = useState(null)
  const [premiumScanning, setPremiumScanning]     = useState(false)
  const [premiumScanningUrl, setPremiumScanningUrl] = useState('')
  const [premiumLiveData, setPremiumLiveData]     = useState({})

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  useEffect(() => {
    const match = path.match(UUID_REGEX)
    if (!match) return
    const id = match[1]
    if (reportId === id) return
    setLoading(true)
    fetch(`/api/get-report?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { navigate('/'); return }
        setScanData(data.scan_data)
        setReportData(data.report_data)
        setWebsiteUrl(data.website_url)
        setReportId(id)
        setScanError(null)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [path])

  // Load premium report from UUID path
  useEffect(() => {
    const match = path.match(PREMIUM_UUID_REGEX)
    if (!match) return
    const id = match[1]
    if (premiumReportId === id) return
    setLoading(true)
    fetch(`/api/get-premium-report?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { navigate('/premium'); return }
        setPremiumScanData(data.scan_data)
        setPremiumReportData(data.report_data)
        setPremiumWebsiteUrl(data.website_url)
        setPremiumReportId(id)
      })
      .catch(() => navigate('/premium'))
      .finally(() => setLoading(false))
  }, [path])

  const navigate = (to) => {
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }

  const handleScanStart = async ({ url, manualSocial = {} }) => {
    if (scanning) return
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    setScanningUrl(url)
    setLiveData({})
    setScanning(true)
    setScanError(null)

    let scan = null
    let report = null

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: fullUrl, manualSocial }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw { code: err.error || 'generic', message: err.message }
      }
      scan = await res.json()
      setLiveData({
        perf: scan.website || null,
        seo: scan.content?.seo || null,
        copy: scan.content?.copy || null,
        benchmarkLabel: scan.benchmarkData?.industryLabel || null,
        social: { tiktok: scan.tiktok, instagram: scan.instagram },
        report: 'generating',
      })
    } catch (err) {
      setScanning(false)
      setScanError(err.code ? err : { code: 'generic' })
      setWebsiteUrl(url)
      setRetryFn(() => () => handleScanStart({ url, manualSocial }))
      navigate('/report')
      return
    }

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData: scan, websiteUrl: fullUrl }),
      })
      if (!res.ok) throw new Error('Report generation failed')
      const data = await res.json()
      report = data.report
      setLiveData(prev => ({ ...prev, report: 'done' }))
    } catch (err) {
      setScanning(false)
      setScanError({ code: 'generic' })
      setWebsiteUrl(url)
      setRetryFn(() => () => handleScanStart({ url, manualSocial }))
      navigate('/report')
      return
    }

    // FIX #5: Alle State-Updates + navigate BEVOR setScanning(false)
    // Verhindert den kurzen Flash zur Landingpage, weil der Pfad
    // schon /report ist wenn die Scanning-Overlay verschwindet.
    setScanData(scan)
    setReportData(report)
    setWebsiteUrl(url)
    setScanError(null)
    setRetryFn(null)
    navigate('/report')      // ← Pfad zuerst setzen
    setScanning(false)       // ← dann Overlay ausblenden — Report wird sofort gezeigt

    // Im Hintergrund speichern und URL auf UUID updaten
    try {
      const res = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData: scan, reportData: report, websiteUrl: fullUrl }),
      })
      const data = await res.json()
      if (data.id) {
        setReportId(data.id)
        navigate(`/report/${data.id}`)
      }
    } catch (e) {
      console.error('Save report failed, falling back to in-memory report:', e)
    }
  }

  // ── Premium scan handler ────────────────────────────────────────────────────
  const handlePremiumScanStart = async ({ url, handles = {} }) => {
    if (premiumScanning) return
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    setPremiumScanningUrl(url)
    setPremiumLiveData({})
    setPremiumScanning(true)

    let scan = null, report = null

    try {
      const res = await fetch('/api/premium-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: fullUrl, handles }),
      })
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw { code: err.error || 'generic' } }
      scan = await res.json()
      setPremiumLiveData({
        perf: scan.website || null,
        seo: scan.content?.seo || null,
        copy: scan.content?.copy || null,
        benchmarkLabel: scan.benchmarkData?.industryLabel || null,
        social: { tiktok: scan.tiktok, instagram: scan.instagram },
        report: 'generating',
      })
    } catch (err) {
      setPremiumScanning(false)
      navigate('/premium')
      return
    }

    try {
      const res = await fetch('/api/premium-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData: scan, websiteUrl: fullUrl }),
      })
      if (!res.ok) throw new Error('Report generation failed')
      const data = await res.json()
      report = data.report
      setPremiumLiveData(prev => ({ ...prev, report: 'done' }))
    } catch (err) {
      setPremiumScanning(false)
      navigate('/premium')
      return
    }

    setPremiumScanData(scan)
    setPremiumReportData(report)
    setPremiumWebsiteUrl(url)
    navigate('/premium/report')
    setPremiumScanning(false)

    try {
      const res = await fetch('/api/save-premium-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData: scan, reportData: report, websiteUrl: fullUrl, handles }),
      })
      const data = await res.json()
      if (data.id) { setPremiumReportId(data.id); navigate(`/premium/${data.id}`) }
    } catch (e) { console.error('Save premium report failed:', e) }
  }

  const handleScanComplete = async (scan, report, url) => {
    setScanData(scan)
    setReportData(report)
    setWebsiteUrl(url)
    setScanError(null)
    setRetryFn(null)
    navigate('/report')
    setScanning(false)

    try {
      const res = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData: scan, reportData: report, websiteUrl: url }),
      })
      const data = await res.json()
      if (data.id) { setReportId(data.id); navigate(`/report/${data.id}`) }
    } catch (e) {
      console.error('Save report failed:', e)
    }
  }

  const handleScanError = (error, url, retry) => {
    setScanData(null)
    setReportData(null)
    setWebsiteUrl(url || websiteUrl)
    setScanError(error)
    setRetryFn(() => retry)
    setScanning(false)
    navigate('/report')
  }

  const handleRetry = () => {
    setScanError(null)
    setRetryFn(null)
    if (retryFn) retryFn()
  }

  if (path === '/impressum') return <Impressum navigate={navigate} />
  if (path === '/privacy')   return <PrivacyPolicy navigate={navigate} />

  if (scanning) return <ScanningScreen url={scanningUrl} liveData={liveData} />

  const isReportPath = path === '/report' || UUID_REGEX.test(path)
  if (isReportPath) {
    if (loading) return <Spinner />
    return (
      <Report
        navigate={navigate}
        scanData={scanData}
        reportData={reportData}
        websiteUrl={websiteUrl}
        reportId={reportId}
        scanError={scanError}
        onRetry={handleRetry}
      />
    )
  }

  // ── Premium scanning overlay ─────────────────────────────────────────────────
  if (premiumScanning) return <ScanningScreen url={premiumScanningUrl} liveData={premiumLiveData} />

  // ── Premium report path ───────────────────────────────────────────────────────
  if (path === '/premium/report' || PREMIUM_UUID_REGEX.test(path)) {
    if (loading) return <Spinner />
    return (
      <PremiumReport
        navigate={navigate}
        scanData={premiumScanData}
        reportData={premiumReportData}
        websiteUrl={premiumWebsiteUrl}
        reportId={premiumReportId}
      />
    )
  }

  // ── Premium scan form ─────────────────────────────────────────────────────────
  if (path === '/premium') {
    return <PremiumScanForm navigate={navigate} onScanStart={handlePremiumScanStart} />
  }

  return (
    <Home
      navigate={navigate}
      onScanStart={handleScanStart}
      onScanComplete={handleScanComplete}
      onScanError={handleScanError}
    />
  )
}