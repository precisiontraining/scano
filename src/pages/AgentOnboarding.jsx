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
              width: 32, height: 1,
              background: i < current ? C.accent : C.border,
              transition: 'background .3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// Step 1 – Website URL
function Step1({ onNext }) {
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
        <button className="ob-btn" onClick={handleNext}>Continue →</button>
      </div>
    </div>
  )
}

// Step 2 – GitHub
function Step2({ onNext, onBack }) {
  const [installationId, setInstallationId] = useState('')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [error, setError] = useState('')

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
        The agent needs access to your repo to read your code and create Pull Requests with fixes.
      </p>

      {/* GitHub App Install */}
      <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>1. Install the Scano GitHub App</p>
        <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, marginBottom: 12, lineHeight: 1.6 }}>
          Click below to install the app on your GitHub account and select which repo to give access to.
        </p>
        
          href="https://github.com/apps/scano-growth-agent/installations/new"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block', background: C.text, color: '#fff',
            borderRadius: 8, padding: '10px 18px', fontSize: 13,
            fontFamily: 'Jost, sans-serif', fontWeight: 500,
            textDecoration: 'none', transition: 'background .2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.accent}
          onMouseLeave={e => e.currentTarget.style.background = C.text}
        Install GitHub App &#8594;
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>2. Enter your details</p>

        <div>
          <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>GitHub Username / Organization</label>
          <input className="ob-inp" placeholder="e.g. FlosGit" value={repoOwner} onChange={e => setRepoOwner(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>Repository Name</label>
          <input className="ob-inp" placeholder="e.g. my-website" value={repoName} onChange={e => setRepoName(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>
            Installation ID
            <span style={{ marginLeft: 6, fontSize: 11, color: C.textLight, fontWeight: 300 }}>
              (from the URL after installing: github.com/settings/installations/<strong>12345678</strong>)
            </span>
          </label>
          <input className="ob-inp" placeholder="e.g. 129153460" value={installationId} onChange={e => setInstallationId(e.target.value)} />
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
        <button className="ob-btn" onClick={handleNext}>Continue →</button>
      </div>
    </div>
  )
}

// Step 3 – PostHog
function Step3({ onNext, onBack, loading }) {
  const [posthogKey, setPosthogKey] = useState('')
  const [posthogProjectId, setPosthogProjectId] = useState('')
  const [skip, setSkip] = useState(false)

  const handleNext = () => {
    if (!skip && (!posthogKey.trim() || !posthogProjectId.trim())) {
      onNext({ posthogKey: null, posthogProjectId: null })
      return
    }
    onNext({ posthogKey: skip ? null : posthogKey, posthogProjectId: skip ? null : posthogProjectId })
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 3 of 3</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Connect Analytics
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        Connect PostHog so the agent can see real visitor data — bounce rates, traffic sources, top pages — and make smarter recommendations.
      </p>

      {!skip ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>
              Don't have PostHog? <a href="https://posthog.com" target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 400 }}>Create a free account →</a><br />
              Then install it on your website and create a Personal API Key with "Performing analytics queries" permission.
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
            No problem — the agent will still analyze your code and make improvements. You can add PostHog later from your dashboard.
          </p>
        </div>
      )}

      <button onClick={() => setSkip(!skip)} style={{ background: 'none', border: 'none', fontSize: 13, color: C.textLight, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 300, padding: '0 0 16px', textDecoration: 'underline' }}>
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

  const handleStep1 = (data) => {
    setFormData(prev => ({ ...prev, ...data }))
    setStep(1)
  }

  const handleStep2 = (data) => {
    setFormData(prev => ({ ...prev, ...data }))
    setStep(2)
  }

  const handleStep3 = async (data) => {
    setLoading(true)
    setError('')

    const allData = { ...formData, ...data }

    try {
      // Create subscription
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

      // Create connection
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
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Logo */}
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 40, cursor: 'pointer', justifyContent: 'center' }}>
            <Logo size={22} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>/ Growth Agent Setup</span>
          </div>

          <div className="ob-card" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: '36px 32px', boxShadow: '0 4px 32px rgba(28,25,23,0.07)' }}>
            <StepIndicator current={step} total={3} />

            {step === 0 && <Step1 onNext={handleStep1} />}
            {step === 1 && <Step2 onNext={handleStep2} onBack={() => setStep(0)} />}
            {step === 2 && <Step3 onNext={handleStep3} onBack={() => setStep(1)} loading={loading} />}

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