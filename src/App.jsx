import { useState, useEffect } from 'react'
import Home from './Home.jsx'
import Report from './pages/Report.jsx'
import Impressum from './pages/Impressum.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [scanData, setScanData] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [websiteUrl, setWebsiteUrl] = useState('')

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const navigate = (to) => {
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }

  const handleScanComplete = (scan, report, url) => {
    setScanData(scan)
    setReportData(report)
    setWebsiteUrl(url)
    navigate('/report')
  }

  if (path === '/impressum') return <Impressum navigate={navigate} />
  if (path === '/privacy') return <PrivacyPolicy navigate={navigate} />
  if (path === '/report') return <Report navigate={navigate} scanData={scanData} reportData={reportData} websiteUrl={websiteUrl} />
  return <Home navigate={navigate} onScanComplete={handleScanComplete} />
}