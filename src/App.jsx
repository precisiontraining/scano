import { useState, useEffect } from 'react'
import Home from './Home.jsx'
import Report from './pages/Report.jsx'
import Impressum from './pages/Impressum.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'

const UUID_REGEX = /^\/report\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i

const Spinner = () => (
  <div style={{
    minHeight: '100vh',
    background: '#f7f4ef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 16,
    fontFamily: 'Jost, sans-serif',
  }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    <div style={{
      width: 32, height: 32,
      border: '2px solid rgba(28,25,23,0.15)',
      borderTopColor: '#2a5c45',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
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

  // Error state: { code: 'unreachable' | 'timeout' | 'no_data' | 'generic' } | null
  const [scanError, setScanError]   = useState(null)
  // Retry function passed up from Home → stored here so Report can call it
  const [retryFn, setRetryFn]       = useState(null)

  // Listen for browser back/forward
  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  // Load report from Supabase when /report/:uuid is visited directly
  useEffect(() => {
    const match = path.match(UUID_REGEX)
    if (!match) return

    const id = match[1]
    if (reportId === id) return // already loaded from this session

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

  // Called by Home after a successful scan + report generation
  const handleScanComplete = async (scan, report, url) => {
    setScanData(scan)
    setReportData(report)
    setWebsiteUrl(url)
    setScanError(null)
    setRetryFn(null)

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

  // Called by Home when the scan or report API returns an error.
  // `retry` is a function that re-runs the exact same scan without
  // requiring the user to re-enter their URL or social data.
  const handleScanError = (error, url, retry) => {
    setScanData(null)
    setReportData(null)
    setWebsiteUrl(url || websiteUrl)
    setScanError(error)
    // useState setter with a function value must be wrapped to avoid
    // React treating the function itself as an updater.
    setRetryFn(() => retry)
    navigate('/report')
  }

  // Retry handler passed to Report — clears the error, goes back to
  // Home's loading state, and re-runs the scan.
  const handleRetry = () => {
    setScanError(null)
    setRetryFn(null)
    if (retryFn) retryFn()
  }

  if (path === '/impressum') return <Impressum navigate={navigate} />
  if (path === '/privacy')   return <PrivacyPolicy navigate={navigate} />

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
      onScanComplete={handleScanComplete}
      onScanError={handleScanError}
    />
  )
}