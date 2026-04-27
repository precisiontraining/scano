import { useState, useEffect } from 'react'
import Home from './Home.jsx'
import Impressum from './pages/Impressum.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'

export default function App() {
  const [path, setPath] = useState(window.location.pathname)

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

  if (path === '/impressum') return <Impressum navigate={navigate} />
  if (path === '/privacy') return <PrivacyPolicy navigate={navigate} />
  return <Home navigate={navigate} />
}