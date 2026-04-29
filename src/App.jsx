import { useState, useEffect } from 'react'
import Home from './Home.jsx'
import Report from './pages/Report.jsx'
import Impressum from './pages/Impressum.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'

const UUID_REGEX = /^\/report\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i

// ─── Scanning overlay — shows live data as it comes in ───────────────────────
const CSS_SCANNER = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; }
  @keyframes spin    { to { transform: rotate(360deg) } }
  @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes scanBar { from { width: 0 } }
  .live-row { animation: fadeIn 0.4s ease forwards; opacity: 0; }
`

// Maps a performance score (0–100) to a rough percentile label
function perfLabel(score) {
  if (score == null) return null
  const slower = Math.round(100 - score)
  return `slower than ~${slower}% of mobile pages`
}

function ScanningScreen({ url, liveData }) {
  // liveData: { perf, seo, copy, social } — populated progressively
  const rows = []

  if (liveData.perf != null) {
    const label = perfLabel(liveData.perf.performanceScore)
    rows.push({
      key: 'perf',
      icon: liveData.perf.performanceScore >= 70 ? '🟢' : liveData.perf.performanceScore >= 40 ? '🟡' : '🔴',
      text: `Performance: ${liveData.perf.performanceScore}/100${label ? ` — ${label}` : ''}`,
    })
    if (liveData.perf.coreWebVitals?.lcp) {
      rows.push({
        key: 'lcp',
        icon: '⏱',
        text: `LCP: ${liveData.perf.coreWebVitals.lcp} — load speed of your largest element`,
      })
    }
  }

  if (liveData.seo != null) {
    rows.push({
      key: 'seo',
      icon: liveData.seo.score >= 70 ? '🟢' : liveData.seo.score >= 40 ? '🟡' : '🔴',
      text: `SEO: ${liveData.seo.score}/100 — ${liveData.seo.issues.length > 0 ? `${liveData.seo.issues.length} issue${liveData.seo.issues.length > 1 ? 's' : ''} found` : 'no major issues'}`,
    })
  }

  if (liveData.copy != null) {
    rows.push({
      key: 'copy',
      icon: liveData.copy.score >= 70 ? '🟢' : liveData.copy.score >= 40 ? '🟡' : '🔴',
      text: `Copy & UX: ${liveData.copy.score}/100 — ${liveData.copy.hasCTA ? 'CTA found' : 'no CTA detected'}${liveData.copy.isOutcomeFocused ? ', outcome-focused headline' : ', headline not outcome-focused'}`,
    })
  }

  if (liveData.benchmarkLabel) {
    rows.push({
      key: 'industry',
      icon: '📊',
      text: `Industry: ${liveData.benchmarkLabel} — comparing against benchmarks`,
    })
  }

  if (liveData.social) {
    const s = liveData.social
    if (s.tiktok) rows.push({ key: 'tiktok', icon: '📱', text: `TikTok: ${s.tiktok.engagementRate}% engagement — running benchmark comparison` })
    if (s.instagram) rows.push({ key: 'ig', icon: '📸', text: `Instagram: ${s.instagram.followers?.toLocaleString()} followers — running benchmark comparison` })
  }

  if (liveData.report === 'generating') {
    rows.push({ key: 'ai', icon: '🤖', text: 'Generating AI analysis with benchmark context…' })
  }

  // Phase label
  const phase = (() => {
    if (liveData.report === 'generating') return 'Writing your personalised report…'
    if (liveData.copy != null) return 'Running benchmark comparisons…'
    if (liveData.seo != null) return 'Analysing copy & conversion signals…'
    if (liveData.perf != null) return 'Scanning SEO & metadata…'
    return 'Scanning website performance…'
  })()

  // Progress 0–100
  const progress = (() => {
    if (liveData.report === 'done') return 100
    if (liveData.report === 'generating') return 80
    if (liveData.copy != null) return 60
    if (liveData.seo != null) return 40
    if (liveData.perf != null) return 25
    return 8
  })()

  return (
    <>
      <style>{CSS_SCANNER}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Jost, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 520, padding: '0 24px' }}>

          {/* Logo */}
          <p style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 22, color: '#1c1917', marginBottom: 32, textAlign: 'center' }}>Scano</p>

          {/* URL being scanned */}
          <p style={{ fontSize: 12, color: '#a09890', textAlign: 'center', marginBottom: 24, fontWeight: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</p>

          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(28,25,23,0.08)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#2a5c45', borderRadius: 2, width: `${progress}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' }} />
          </div>
          <p style={{ fontSize: 12, color: '#6b6460', fontWeight: 300, marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid rgba(28,25,23,0.15)', borderTopColor: '#2a5c45', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            {phase}
          </p>

          {/* Live data rows */}
          {rows.length > 0 && (
            <div style={{ background: '#ffffff', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 14, padding: '4px 0', marginBottom: 24 }}>
              {rows.map((row, i) => (
                <div key={row.key} className="live-row" style={{ animationDelay: `${i * 0.06}s`, display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 18px', borderBottom: i < rows.length - 1 ? '1px solid rgba(28,25,23,0.05)' : 'none' }}>
                  <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.5 }}>{row.icon}</span>
                  <span style={{ fontSize: 13, color: '#6b6460', fontWeight: 300, lineHeight: 1.5 }}>{row.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state placeholder */}
          {rows.length === 0 && (
            <div style={{ background: '#ffffff', border: '1px solid rgba(28,25,23,0.08)', borderRadius: 14, padding: '28px 18px', marginBottom: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#a09890', fontWeight: 300, animation: 'pulse 1.5s ease infinite' }}>Connecting to your website…</p>
            </div>
          )}

          <p style={{ fontSize: 11, color: '#a09890', textAlign: 'center', fontWeight: 300 }}>This usually takes 15–25 seconds</p>
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
  const [path, setPath]             = useState(window.location.pathname)
  const [scanData, setScanData]     = useState(null)
  const [reportData, setReportData] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [reportId, setReportId]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [scanError, setScanError]   = useState(null)
  const [retryFn, setRetryFn]       = useState(null)

  // ── Live scan state — shown during the scanning overlay ──
  const [scanning, setScanning]     = useState(false)
  const [scanningUrl, setScanningUrl] = useState('')
  const [liveData, setLiveData]     = useState({})
  // liveData shape: { perf, seo, copy, benchmarkLabel, social, report }

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

  const navigate = (to) => {
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }

  // ── Called by Home when a scan starts — we show the scanning overlay ──
  // Home passes { url, manualSocial } so we can run the scan ourselves
  // and update liveData progressively.
  //
  // To keep backward compat: Home can still call the old onScanComplete / onScanError.
  // But if it calls onScanStart, App takes over the fetch and shows live data.
  const handleScanStart = async ({ url, manualSocial = {} }) => {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    setScanningUrl(url)
    setLiveData({})
    setScanning(true)
    setScanError(null)

    let scan = null
    let report = null

    // ── Step 1: run the scan ──
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

      // Push live data as soon as the scan comes back
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

    // ── Step 2: generate report ──
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
      // If report gen fails, show error but we still have scan data
      setScanning(false)
      setScanError({ code: 'generic' })
      setWebsiteUrl(url)
      setRetryFn(() => () => handleScanStart({ url, manualSocial }))
      navigate('/report')
      return
    }

    // ── Step 3: save & navigate ──
    setScanning(false)
    setScanData(scan)
    setReportData(report)
    setWebsiteUrl(url)
    setScanError(null)
    setRetryFn(null)

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
        return
      }
    } catch (e) {
      console.error('Save report failed, falling back to in-memory report:', e)
    }

    setReportId(null)
    navigate('/report')
  }

  // Legacy callbacks for Home — kept so existing Home.jsx still works
  // without modification if it doesn't call onScanStart yet.
  const handleScanComplete = async (scan, report, url) => {
    setScanData(scan)
    setReportData(report)
    setWebsiteUrl(url)
    setScanError(null)
    setRetryFn(null)
    setScanning(false)

    try {
      const res = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanData: scan, reportData: report, websiteUrl: url }),
      })
      const data = await res.json()
      if (data.id) {
        setReportId(data.id)
        navigate(`/report/${data.id}`)
        return
      }
    } catch (e) {
      console.error('Save report failed, falling back to in-memory report:', e)
    }

    setReportId(null)
    navigate('/report')
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

  // ── Route ──
  if (path === '/impressum') return <Impressum navigate={navigate} />
  if (path === '/privacy')   return <PrivacyPolicy navigate={navigate} />

  // Show scanning overlay while active
  if (scanning) {
    return <ScanningScreen url={scanningUrl} liveData={liveData} />
  }

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

  return (
    <Home
      navigate={navigate}
      onScanStart={handleScanStart}      // new — App handles the fetch + live UI
      onScanComplete={handleScanComplete} // legacy fallback
      onScanError={handleScanError}       // legacy fallback
    />
  )
}