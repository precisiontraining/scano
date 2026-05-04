import { useState, useEffect } from 'react'
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
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .ob-card { animation: fadeUp .4s ease both; }
  .ob-inp {
    width: 100%; background: #fff; border: 1px solid rgba(28,25,23,0.12); border-radius: 10px;
    padding: 13px 16px; color: #1c1917; font-family: 'Jost', sans-serif;
    font-weight: 300; font-size: 15px; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .ob-inp:focus { border-color: rgba(42,92,69,0.4); box-shadow: 0 0 0 3px rgba(42,92,69,0.08); }
  .ob-inp::placeholder { color: #b0a89e; }
  .ob-btn {
    width: 100%; background: #1c1917; color: #f7f4ef; border: none; border-radius: 10px;
    padding: 15px; font-family: 'Jost', sans-serif; font-weight: 500; font-size: 15px;
    cursor: pointer; transition: background .2s, transform .15s; letter-spacing: .03em;
  }
  .ob-btn:hover:not(:disabled) { background: #2a5c45; transform: translateY(-1px); }
  .ob-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .ob-btn-ghost {
    width: 100%; background: transparent; color: #1c1917;
    border: 1px solid rgba(28,25,23,0.15); border-radius: 10px;
    padding: 14px; font-family: 'Jost', sans-serif; font-weight: 400; font-size: 15px;
    cursor: pointer; transition: all .2s; letter-spacing: .03em;
  }
  .ob-btn-ghost:hover { border-color: rgba(28,25,23,0.3); background: rgba(28,25,23,0.03); }
  .req-item { transition: all .3s ease; }
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

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: i < current ? C.accent : i === current ? C.text : 'transparent',
            border: `1px solid ${i <= current ? 'transparent' : C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 500,
            color: i <= current ? '#fff' : C.textLight,
            transition: 'all .3s',
          }}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div style={{
              width: 24, height: 1,
              background: i < current ? C.accent : C.border,
              transition: 'background .3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

function Step0({ onNext }) {
  const [checks, setChecks] = useState({
    github: null,
    vercel: null,
    react: null,
    admin: null,
  })

  const requirements = [
    {
      key: 'github',
      icon: '🐙',
      title: 'GitHub account + repo',
      desc: "Your website's code must be in a GitHub repository.",
      fixText: 'Create a free GitHub account',
      fixUrl: 'https://github.com/signup',
    },
    {
      key: 'vercel',
      icon: '▲',
      title: 'Deployed via Vercel',
      desc: 'Your site must be connected to Vercel for automatic deployment after each approved fix.',
      fixText: 'Connect your repo to Vercel (free)',
      fixUrl: 'https://vercel.com/new',
    },
    {
      key: 'react',
      icon: '⚛️',
      title: 'React, Next.js, or Vite project',
      desc: 'The agent writes React/JSX code. Shopify, Wix, Squarespace and similar builders are not supported.',
      fixText: null,
      notSupportedText: 'Shopify, Wix, Squarespace, Webflow are not supported',
    },
    {
      key: 'admin',
      icon: '🔑',
      title: 'Admin access to the repo',
      desc: 'You need to be able to install GitHub Apps and merge Pull Requests.',
      fixText: null,
    },
  ]

  const allChecked = Object.values(checks).every(v => v === true)
  const hasBlocker = Object.values(checks).some(v => v === false)

  const toggle = (key, value) => {
    setChecks(prev => ({ ...prev, [key]: prev[key] === value ? null : value }))
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Before we start</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Requirements check
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>
        The Growth Agent needs a few things to work. Check off what you have — we'll help with the rest.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {requirements.map((req) => {
          const status = checks[req.key]
          const isYes = status === true
          const isNo = status === false

          return (
            <div key={req.key} className="req-item" style={{
              border: `1px solid ${isYes ? 'rgba(42,92,69,0.3)' : isNo ? 'rgba(192,57,43,0.3)' : C.border}`,
              borderRadius: 12,
              background: isYes ? 'rgba(42,92,69,0.04)' : isNo ? 'rgba(192,57,43,0.04)' : '#fff',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{req.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 3 }}>{req.title}</p>
                  <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>{req.desc}</p>
                  {isNo && req.fixUrl && (
                    <a href={req.fixUrl} target="_blank" rel="noreferrer" style={{
                      display: 'inline-block', marginTop: 8,
                      fontSize: 12, color: C.accent, fontWeight: 400,
                      textDecoration: 'none', borderBottom: '1px solid rgba(42,92,69,0.3)',
                    }}>
                      {req.fixText} →
                    </a>
                  )}
                  {isNo && req.notSupportedText && (
                    <p style={{ fontSize: 12, color: C.red, marginTop: 8, fontWeight: 300 }}>
                      ✕ {req.notSupportedText}
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {status !== null && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: isYes ? '#22c55e' : C.red,
                      boxShadow: isYes ? '0 0 6px #22c55e' : `0 0 6px ${C.red}`,
                      animation: 'pulse 2s ease infinite',
                    }} />
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => toggle(req.key, true)} style={{
                  flex: 1, padding: '10px', fontSize: 13,
                  fontFamily: 'Jost, sans-serif', fontWeight: isYes ? 500 : 300,
                  background: isYes ? 'rgba(42,92,69,0.08)' : 'transparent',
                  color: isYes ? C.accent : C.textMuted,
                  border: 'none', borderRight: `1px solid ${C.border}`,
                  cursor: 'pointer', transition: 'all .2s',
                }}>
                  ✓ Yes, I have this
                </button>
                <button onClick={() => toggle(req.key, false)} style={{
                  flex: 1, padding: '10px', fontSize: 13,
                  fontFamily: 'Jost, sans-serif', fontWeight: isNo ? 500 : 300,
                  background: isNo ? 'rgba(192,57,43,0.06)' : 'transparent',
                  color: isNo ? C.red : C.textMuted,
                  border: 'none',
                  cursor: 'pointer', transition: 'all .2s',
                }}>
                  ✕ I don't have this
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {allChecked && (
        <div style={{ background: 'rgba(42,92,69,0.07)', border: '1px solid rgba(42,92,69,0.25)', borderRadius: 10, padding: '13px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: C.accent, fontWeight: 400 }}>You're all set! Let's get started.</p>
        </div>
      )}

      {hasBlocker && !allChecked && (
        <div style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 10, padding: '13px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: C.red, fontWeight: 400, marginBottom: 4 }}>Some requirements are missing.</p>
          <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>
            Set up the missing items first, then come back to continue. The agent won't work without them.
          </p>
        </div>
      )}

      <button className="ob-btn" onClick={onNext} disabled={!allChecked}>
        {allChecked ? 'Continue — set up the agent' : 'Check all requirements to continue'}
      </button>
    </div>
  )
}

function Step1({ onNext, onBack }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const handleNext = () => {
    if (!url.trim()) { setError('Please enter your website URL.'); return }
    const clean = url.startsWith('http') ? url : `https://${url}`
    onNext({ websiteUrl: clean })
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 1 of 3</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Your website
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        The agent will analyze your website every week and find conversion improvements.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6, letterSpacing: '.03em' }}>Website URL</label>
          <input
            className="ob-inp"
            placeholder="yourwebsite.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNext()}
          />
        </div>
        {error && <p style={{ fontSize: 13, color: C.red }}>{error}</p>}
        <div style={{ height: 8 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
          <button className="ob-btn" onClick={handleNext}>Continue →</button>
        </div>
      </div>
    </div>
  )
}

function Step2({ onNext, onBack }) {
  const [installationId, setInstallationId] = useState('')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [error, setError] = useState('')
  const [appInstalled, setAppInstalled] = useState(false)

  const handleNext = () => {
    if (!installationId.trim() || !repoOwner.trim() || !repoName.trim()) {
      setError('Please fill in all fields.')
      return
    }
    onNext({ installationId, repoOwner, repoName })
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 2 of 3</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Connect GitHub
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        The agent reads your code and creates Pull Requests with fixes — directly in your repo.
      </p>

      <div style={{
        border: `1px solid ${appInstalled ? 'rgba(42,92,69,0.3)' : C.border}`,
        background: appInstalled ? 'rgba(42,92,69,0.04)' : '#fff',
        borderRadius: 12, padding: '16px 18px', marginBottom: 12,
        transition: 'all .3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: appInstalled ? C.accent : 'transparent',
              border: `1px solid ${appInstalled ? C.accent : C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: appInstalled ? '#fff' : C.textLight, fontWeight: 500,
              flexShrink: 0,
            }}>
              {appInstalled ? '✓' : '1'}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Install the Scano GitHub App</p>
          </div>
          {appInstalled && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />}
        </div>
        <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6, marginBottom: 12, paddingLeft: 32 }}>
          Click the button, install on your account, and select the repo. After installing you'll see a URL like{' '}
          <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.06)', padding: '1px 5px', borderRadius: 4 }}>
            github.com/settings/installations/12345678
          </code>{' '}
          — copy that number.
        </p>
        <div style={{ paddingLeft: 32, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://github.com/apps/scano-growth-agent/installations/new"
            target="_blank"
            rel="noreferrer"
            onClick={() => setTimeout(() => setAppInstalled(true), 3000)}
            style={{
              display: 'inline-block', background: C.text, color: '#fff',
              borderRadius: 8, padding: '9px 16px', fontSize: 13,
              fontFamily: 'Jost, sans-serif', fontWeight: 500,
              textDecoration: 'none', transition: 'background .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.accent}
            onMouseLeave={e => e.currentTarget.style.background = C.text}
          >
            Install GitHub App →
          </a>
          {!appInstalled && (
            <button onClick={() => setAppInstalled(true)} style={{ background: 'none', border: 'none', fontSize: 12, color: C.textLight, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 300, textDecoration: 'underline' }}>
              Already installed
            </button>
          )}
        </div>
      </div>

      <div style={{
        border: `1px solid ${C.border}`,
        background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16,
        opacity: appInstalled ? 1 : 0.5,
        transition: 'opacity .3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'transparent', border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: C.textLight, fontWeight: 500, flexShrink: 0,
          }}>2</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Enter your details</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>GitHub Username / Organization</label>
            <input className="ob-inp" placeholder="e.g. FlosGit" value={repoOwner} onChange={e => setRepoOwner(e.target.value)} disabled={!appInstalled} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>Repository Name</label>
            <input className="ob-inp" placeholder="e.g. my-website" value={repoName} onChange={e => setRepoName(e.target.value)} disabled={!appInstalled} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>
              Installation ID
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 300 }}>
                (the number in the URL: /installations/<strong>12345678</strong>)
              </span>
            </label>
            <input className="ob-inp" placeholder="e.g. 129153460" value={installationId} onChange={e => setInstallationId(e.target.value)} disabled={!appInstalled} />
          </div>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
        <button className="ob-btn" onClick={handleNext} disabled={!appInstalled}>Continue →</button>
      </div>
    </div>
  )
}

function Step3({ onNext, onBack, loading }) {
  const [posthogKey, setPosthogKey] = useState('')
  const [posthogProjectId, setPosthogProjectId] = useState('')
  const [skip, setSkip] = useState(false)

  const handleNext = () => {
    onNext({
      posthogKey: skip ? null : posthogKey || null,
      posthogProjectId: skip ? null : posthogProjectId || null,
    })
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 3 of 3</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Connect Analytics
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        Connect PostHog so the agent can see real visitor data and make smarter recommendations.
      </p>

      {!skip ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 4 }}>
            <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.7 }}>
              Don't have PostHog?{' '}
              <a href="https://posthog.com" target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 400 }}>
                Create a free account →
              </a>
              <br />
              Then install it on your site and create a Personal API Key with "Performing analytics queries" permission.
            </p>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>PostHog Personal API Key</label>
            <input className="ob-inp" placeholder="phx_..." value={posthogKey} onChange={e => setPosthogKey(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>PostHog Project ID</label>
            <input className="ob-inp" placeholder="e.g. 171704" value={posthogProjectId} onChange={e => setPosthogProjectId(e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>
            No problem — the agent will still analyze your code. You can add PostHog later from your dashboard.
          </p>
        </div>
      )}

      <button onClick={() => setSkip(!skip)} style={{ background: 'none', border: 'none', fontSize: 13, color: C.textLight, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 300, padding: '0 0 20px', textDecoration: 'underline' }}>
        {skip ? 'I have PostHog — add it now' : 'Skip for now'}
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
        <button className="ob-btn" onClick={handleNext} disabled={loading}>
          {loading ? 'Setting up…' : 'Launch Growth Agent 🚀'}
        </button>
      </div>
    </div>
  )
}

export default function AgentOnboarding({ navigate }) {
  const [step, setStep] = useState(0)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/agent/login'); return }
      setUser(session.user)
    })
  }, [])

  const handleStep0 = () => setStep(1)
  const handleStep1 = (data) => { setFormData(prev => ({ ...prev, ...data })); setStep(2) }
  const handleStep2 = (data) => { setFormData(prev => ({ ...prev, ...data })); setStep(3) }

  const handleStep3 = async (data) => {
    setLoading(true)
    setError('')
    const allData = { ...formData, ...data }

    try {
      const { data: sub, error: subError } = await supabase
        .from('agent_subscriptions')
        .insert({
          user_id: user.id,
          auth_user_id: user.id,
          email: user.email,
          plan: 'growth',
          status: 'active',
        })
        .select()
        .single()

      if (subError) throw subError

      const { error: connError } = await supabase
        .from('agent_connections')
        .insert({
          subscription_id: sub.id,
          github_installation_id: parseInt(allData.installationId),
          github_repo_owner: allData.repoOwner,
          github_repo_name: allData.repoName,
          website_url: allData.websiteUrl,
          posthog_api_key: allData.posthogKey || null,
          posthog_project_id: allData.posthogProjectId || null,
          posthog_host: 'https://eu.posthog.com',
        })

      if (connError) throw connError

      navigate('/agent/dashboard')
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40, cursor: 'pointer', justifyContent: 'center' }}>
            <Logo size={22} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>/ Growth Agent Setup</span>
          </div>

          <div className="ob-card" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: '36px 32px', boxShadow: '0 4px 32px rgba(28,25,23,0.07)' }}>
            <StepIndicator current={step} total={4} />
            {step === 0 && <Step0 onNext={handleStep0} />}
            {step === 1 && <Step1 onNext={handleStep1} onBack={() => setStep(0)} />}
            {step === 2 && <Step2 onNext={handleStep2} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 onNext={handleStep3} onBack={() => setStep(2)} loading={loading} />}
            {error && (
              <div style={{ marginTop: 16, background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: C.red }}>
                {error}
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: C.textLight, marginTop: 20, fontWeight: 300 }}>
            Takes about 5 minutes · You can change everything later
          </p>
        </div>
      </div>
    </>
  )
}