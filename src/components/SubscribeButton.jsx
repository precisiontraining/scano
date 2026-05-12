import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const LABELS = {
  full_scan: 'Get Full Scan – 9€',
  subscription: 'Subscribe – 29€/month',
}

export default function SubscribeButton({ type, style = {}, className = '' }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading) return
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userId }),
      })

      const data = await res.json()

      if (!res.ok || !data.url) {
        console.error('Checkout session error:', data.error)
        setLoading(false)
        return
      }

      window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err)
      setLoading(false)
    }
  }

  const label = LABELS[type] || 'Buy Now'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{
        background: '#1c1917',
        color: '#f7f4ef',
        border: 'none',
        borderRadius: 10,
        padding: '14px 28px',
        fontFamily: 'Jost, sans-serif',
        fontWeight: 500,
        fontSize: 15,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        letterSpacing: '.02em',
        transition: 'background .2s, transform .15s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        ...style,
      }}
    >
      {loading && (
        <span style={{
          width: 14,
          height: 14,
          border: '1.5px solid rgba(247,244,239,0.35)',
          borderTopColor: '#f7f4ef',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'spin 0.7s linear infinite',
        }} />
      )}
      {loading ? 'Redirecting…' : label}
    </button>
  )
}
