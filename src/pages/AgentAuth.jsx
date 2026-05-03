import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const C = {
  bg:        '#f7f4ef',
  bgCard:    '#ffffff',
  text:      '#1c1917',
  textMuted: '#6b6460',
  textLight: '#a09890',
  border:    'rgba(28,25,23,0.09)',
  accent:    '#2a5c45',
  red:       '#c0392b',
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  .auth-card { animation: fadeUp .4s ease both; }
  .auth-inp {
    width: 100%; background: #fff; border: 1px solid rgba(28,25,23,0.12); border-radius: 10px;
    padding: 13px 16px; color: #1c1917; font-family: 'Jost', sans-serif;
    font-weight: 300; font-size: 15px; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .auth-inp:focus { border-color: rgba(42,92,69,0.4); box-shadow: 0 0 0 3px rgba(42,92,69,0.08); }
  .auth-inp::placeholder { color: #b0a89e; }
  .auth-btn {
    width: 100%; background: #1c1917; color: #f7f4ef; border: none; border-radius: 10px;
    padding: 15px; font-family: 'Jost', sans-serif; font-weight: 500; font-size: 15px;
    cursor: pointer; transition: background .2s, transform .15s;
    letter-spacing: .03em;
  }
  .auth-btn:hover:not(:disabled) { background: #2a5c45; transform: translateY(-1px); }
  .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }
`

function Logo({ size = 24, color = '#2a5c45' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="1.1" opacity="0.35"/>
      <circle cx="16" cy="16" r="9"  stroke={color} strokeWidth="1.1" opacity="0.6"/>
      <circle cx="16" cy="16" r="3.2" fill={color}/>
      <line x1="16" y1="2"  x2="16" y2="7"  stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
      <line x1="16" y1="25" x2="16" y2="30" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
      <line x1="2"  y1="16" x2="7"  y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
      <line x1="25" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45"/>
    </svg>
  )
}

export default function AgentAuth({ navigate, mode = 'login' }) {
  const [tab, setTab]         = useState(mode)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError('')
    setSuccess('')
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)

    if (tab === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      setSuccess('Check your email to confirm your account, then log in.')
      setLoading(false)
      return
    }

    if (tab === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError('Incorrect email or password.'); setLoading(false); return }
      navigate('/agent/dashboard')
    }
  }

  async function handleForgot() {
    if (!email.trim()) { setError('Enter your email first.'); return }
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://scano-snowy.vercel.app/agent/reset-password'
    })
    setSuccess('Password reset email sent.')
    setLoading(false)
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="auth-card" style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo */}
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40, cursor: 'pointer', justifyContent: 'center' }}>
            <Logo size={22} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>/ Growth Agent</span>
          </div>

          {/* Card */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: '36px 32px', boxShadow: '0 4px 32px rgba(28,25,23,0.07)' }}>

            {/* Tab switcher */}
            <div style={{ display: 'flex', background: 'rgba(28,25,23,0.05)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
              {[{ key: 'login', label: 'Log in' }, { key: 'register', label: 'Create account' }].map(t => (
                <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess('') }} style={{
                  flex: 1, background: tab === t.key ? '#fff' : 'transparent',
                  border: 'none', borderRadius: 8, padding: '9px',
                  fontFamily: 'Jost, sans-serif', fontSize: 13,
                  fontWeight: tab === t.key ? 500 : 300,
                  color: tab === t.key ? C.text : C.textLight,
                  cursor: 'pointer', transition: 'all .2s',
                  boxShadow: tab === t.key ? '0 1px 6px rgba(28,25,23,0.1)' : 'none',
                }}>{t.label}</button>
              ))}
            </div>

            <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 26, letterSpacing: '-.015em', marginBottom: 6, color: C.text }}>
              {tab === 'login' ? 'Welcome back' : 'Get started'}
            </h2>
            <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, marginBottom: 24, lineHeight: 1.6 }}>
              {tab === 'login'
                ? 'Log in to your Growth Agent dashboard.'
                : 'Create your account to start the Growth Agent.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: C.textLight, fontWeight: 300, display: 'block', marginBottom: 6, letterSpacing: '.03em' }}>Email</label>
                <input
                  className="auth-inp"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textLight, fontWeight: 300, display: 'block', marginBottom: 6, letterSpacing: '.03em' }}>Password</label>
                <input
                  className="auth-inp"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: C.red }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{ background: 'rgba(42,92,69,0.06)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: C.accent }}>
                  {success}
                </div>
              )}

              <div style={{ height: 4 }} />

              <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Please wait…' : tab === 'login' ? 'Log in →' : 'Create account →'}
              </button>

              {tab === 'login' && (
                <button onClick={handleForgot} disabled={loading} style={{ background: 'none', border: 'none', fontSize: 13, color: C.textLight, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 300, padding: '4px 0', transition: 'color .2s' }}
                  onMouseEnter={e => e.target.style.color = C.accent}
                  onMouseLeave={e => e.target.style.color = C.textLight}
                >Forgot password?</button>
              )}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: C.textLight, marginTop: 20, fontWeight: 300 }}>
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: C.accent, fontSize: 12, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>
              {tab === 'login' ? 'Create one' : 'Log in'}
            </button>
          </p>

        </div>
      </div>
    </>
  )
}