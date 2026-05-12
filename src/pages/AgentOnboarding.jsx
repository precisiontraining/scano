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
  html, body { overflow-x: hidden; max-width: 100vw; }
  body { background: #f7f4ef; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  img, svg, video { max-width: 100%; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  .ob-card { animation: fadeUp .4s ease both; }
  .ob-inp {
    width: 100%; background: #fff; border: 1px solid rgba(28,25,23,0.12); border-radius: 10px;
    padding: 13px 16px; color: #1c1917; font-family: 'Jost', sans-serif;
    font-weight: 300; font-size: 15px; outline: none;
    transition: border-color .2s, box-shadow .2s;
  }
  .ob-inp:focus { border-color: rgba(42,92,69,0.4); box-shadow: 0 0 0 3px rgba(42,92,69,0.08); }
  .ob-inp::placeholder { color: #b0a89e; }
  .ob-inp:disabled { opacity: 0.5; cursor: not-allowed; }
  .ob-inp.valid { border-color: rgba(42,92,69,0.5); }
  .ob-inp.invalid { border-color: rgba(192,57,43,0.5); }
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
  .code-display {
    font-family: 'DM Mono', monospace;
    font-size: 22px;
    letter-spacing: .15em;
    color: #2a5c45;
    background: rgba(42,92,69,0.07);
    border: 1px solid rgba(42,92,69,0.2);
    border-radius: 10px;
    padding: 16px;
    text-align: center;
    user-select: all;
  }
  .tg-open-btn {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    width: 100%; background: #229ED9; color: #fff; border: none; border-radius: 10px;
    padding: 15px; font-family: 'Jost', sans-serif; font-weight: 500; font-size: 15px;
    cursor: pointer; transition: background .2s, transform .15s; letter-spacing: .03em;
    text-decoration: none;
  }
  .tg-open-btn:hover { background: #1a8cbf; transform: translateY(-1px); }
  @media (max-width: 600px) {
    .ob-card-inner { padding: 24px 18px !important; }
  }
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

function TelegramIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 13.618l-2.95-.924c-.64-.203-.658-.64.135-.954l11.57-4.461c.537-.194 1.006.131.659.942z"/>
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
              width: 20, height: 1,
              background: i < current ? C.accent : C.border,
              transition: 'background .3s',
            }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── STEP 0: Requirements ────────────────────────────────────────────────────
function Step0({ onNext }) {
  const [checks, setChecks] = useState({ github: null, vercel: null, react: null, admin: null })

  const requirements = [
    {
      key: 'github', icon: '🐙', title: 'GitHub account + repo',
      desc: "Your website's code must be in a GitHub repository.",
      fixText: 'Create a free GitHub account', fixUrl: 'https://github.com/signup',
    },
    {
      key: 'vercel', icon: '▲', title: 'Deployed via Vercel',
      desc: 'Your site must be connected to Vercel for automatic deployment after each approved fix.',
      fixText: 'Connect your repo to Vercel (free)', fixUrl: 'https://vercel.com/new',
    },
    {
      key: 'react', icon: '⚛️', title: 'React, Next.js, or Vite project',
      desc: 'The agent writes React/JSX code. Shopify, Wix, Squarespace and similar builders are not supported.',
      fixText: null, notSupportedText: 'Shopify, Wix, Squarespace, Webflow are not supported',
    },
    {
      key: 'admin', icon: '🔑', title: 'Admin access to the repo',
      desc: 'You need to be able to install GitHub Apps and merge Pull Requests.',
      fixText: null,
    },
  ]

  const allChecked = Object.values(checks).every(v => v === true)
  const hasBlocker = Object.values(checks).some(v => v === false)

  const toggle = (key, value) => setChecks(prev => ({ ...prev, [key]: prev[key] === value ? null : value }))

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
              borderRadius: 12, background: isYes ? 'rgba(42,92,69,0.04)' : isNo ? 'rgba(192,57,43,0.04)' : '#fff',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{req.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 3 }}>{req.title}</p>
                  <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>{req.desc}</p>
                  {isNo && req.fixUrl && (
                    <a href={req.fixUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: C.accent, fontWeight: 400, textDecoration: 'none', borderBottom: '1px solid rgba(42,92,69,0.3)' }}>
                      {req.fixText} →
                    </a>
                  )}
                  {isNo && req.notSupportedText && (
                    <p style={{ fontSize: 12, color: C.red, marginTop: 8, fontWeight: 300 }}>✕ {req.notSupportedText}</p>
                  )}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {status !== null && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isYes ? '#22c55e' : C.red, boxShadow: isYes ? '0 0 6px #22c55e' : `0 0 6px ${C.red}`, animation: 'pulse 2s ease infinite' }} />
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => toggle(req.key, true)} style={{ flex: 1, padding: '10px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: isYes ? 500 : 300, background: isYes ? 'rgba(42,92,69,0.08)' : 'transparent', color: isYes ? C.accent : C.textMuted, border: 'none', borderRight: `1px solid ${C.border}`, cursor: 'pointer', transition: 'all .2s' }}>
                  ✓ Yes, I have this
                </button>
                <button onClick={() => toggle(req.key, false)} style={{ flex: 1, padding: '10px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: isNo ? 500 : 300, background: isNo ? 'rgba(192,57,43,0.06)' : 'transparent', color: isNo ? C.red : C.textMuted, border: 'none', cursor: 'pointer', transition: 'all .2s' }}>
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

// ─── STEP 1: Website ─────────────────────────────────────────────────────────
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
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 1 of 4</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Your website
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        The agent will analyze your website every week and find conversion improvements.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6, letterSpacing: '.03em' }}>Website URL</label>
          <input className="ob-inp" placeholder="yourwebsite.com" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleNext()} />
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

// ─── STEP 2: GitHub ──────────────────────────────────────────────────────────
function Step2({ onNext, onBack }) {
  const [installationId, setInstallationId] = useState('')
  const [repoOwner, setRepoOwner]     = useState('')
  const [repoName, setRepoName]       = useState('')
  const [error, setError]             = useState('')
  const [appInstalled, setAppInstalled] = useState(false)

  // FIX 1: GitHub validation state
  const [validating, setValidating]   = useState(false)
  const [repoValid, setRepoValid]     = useState(null) // null | true | false

  // Validate repo via Velyr's own backend to avoid CORS issues with GitHub API
  const validateRepo = async () => {
    if (!installationId.trim() || !repoOwner.trim() || !repoName.trim()) {
      setError('Please fill in all fields before validating.')
      return
    }
    setValidating(true)
    setError('')
    setRepoValid(null)

    try {
      const res = await fetch('/api/github/validate-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installationId: parseInt(installationId),
          repoOwner: repoOwner.trim(),
          repoName: repoName.trim(),
        }),
      })
      const json = await res.json()
      if (res.ok && json.valid) {
        setRepoValid(true)
        setError('')
      } else {
        setRepoValid(false)
        setError(json.message || 'Could not access this repository. Check your details and try again.')
      }
    } catch {
      setRepoValid(false)
      setError('Validation failed. Please check your connection and try again.')
    } finally {
      setValidating(false)
    }
  }

  // Reset validation when inputs change
  const handleOwnerChange  = (v) => { setRepoOwner(v);  setRepoValid(null); setError('') }
  const handleNameChange   = (v) => { setRepoName(v);   setRepoValid(null); setError('') }
  const handleIdChange     = (v) => { setInstallationId(v); setRepoValid(null); setError('') }

  const handleNext = () => {
    if (!installationId.trim() || !repoOwner.trim() || !repoName.trim()) {
      setError('Please fill in all fields.')
      return
    }
    if (repoValid !== true) {
      setError('Please validate your repository first.')
      return
    }
    onNext({ installationId, repoOwner, repoName })
  }

  const allFilled = installationId.trim() && repoOwner.trim() && repoName.trim()

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 2 of 4</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Connect GitHub
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        The agent reads your code and creates Pull Requests with fixes — directly in your repo.
      </p>

      {/* Install App card */}
      <div style={{ border: `1px solid ${appInstalled ? 'rgba(42,92,69,0.3)' : C.border}`, background: appInstalled ? 'rgba(42,92,69,0.04)' : '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 12, transition: 'all .3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: appInstalled ? C.accent : 'transparent', border: `1px solid ${appInstalled ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: appInstalled ? '#fff' : C.textLight, fontWeight: 500, flexShrink: 0 }}>
              {appInstalled ? '✓' : '1'}
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Install the Velyr GitHub App</p>
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
          <a href="https://github.com/apps/velyr-growth-agent/installations/new" target="_blank" rel="noreferrer" onClick={() => setTimeout(() => setAppInstalled(true), 3000)}
            style={{ display: 'inline-block', background: C.text, color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 500, textDecoration: 'none', transition: 'background .2s' }}
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

      {/* Details + validation card */}
      <div style={{ border: `1px solid ${repoValid === true ? 'rgba(42,92,69,0.3)' : repoValid === false ? 'rgba(192,57,43,0.3)' : C.border}`, background: repoValid === true ? 'rgba(42,92,69,0.04)' : '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16, opacity: appInstalled ? 1 : 0.5, transition: 'all .3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: repoValid === true ? C.accent : 'transparent', border: `1px solid ${repoValid === true ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: repoValid === true ? '#fff' : C.textLight, fontWeight: 500, flexShrink: 0 }}>
            {repoValid === true ? '✓' : '2'}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Enter your details</p>
          {repoValid === true && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', marginLeft: 'auto' }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>GitHub Username / Organization</label>
            <input className={`ob-inp${repoValid === true ? ' valid' : repoValid === false ? ' invalid' : ''}`} placeholder="e.g. FlosGit" value={repoOwner} onChange={e => handleOwnerChange(e.target.value)} disabled={!appInstalled} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>Repository Name</label>
            <input className={`ob-inp${repoValid === true ? ' valid' : repoValid === false ? ' invalid' : ''}`} placeholder="e.g. my-website" value={repoName} onChange={e => handleNameChange(e.target.value)} disabled={!appInstalled} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.textLight, display: 'block', marginBottom: 6 }}>
              Installation ID
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 300 }}>(the number in the URL: /installations/<strong>12345678</strong>)</span>
            </label>
            <input className={`ob-inp${repoValid === true ? ' valid' : repoValid === false ? ' invalid' : ''}`} placeholder="e.g. 129153460" value={installationId} onChange={e => handleIdChange(e.target.value)} disabled={!appInstalled} />
          </div>

          {/* Validate button */}
          {appInstalled && repoValid !== true && (
            <button
              onClick={validateRepo}
              disabled={!allFilled || validating}
              style={{
                background: allFilled && !validating ? 'rgba(42,92,69,0.1)' : 'transparent',
                border: `1px solid ${allFilled ? 'rgba(42,92,69,0.35)' : C.border}`,
                borderRadius: 8, padding: '10px 16px', fontSize: 13,
                fontFamily: 'Jost, sans-serif', fontWeight: 500,
                color: allFilled ? C.accent : C.textLight,
                cursor: allFilled && !validating ? 'pointer' : 'not-allowed',
                transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {validating ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  Validating…
                </>
              ) : '→ Validate repository access'}
            </button>
          )}

          {repoValid === true && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.accent, fontWeight: 400 }}>
              <span>✓</span> Repository verified — the agent can access <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{repoOwner}/{repoName}</code>
            </div>
          )}
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
        <button className="ob-btn" onClick={handleNext} disabled={!appInstalled || repoValid !== true}>Continue →</button>
      </div>
    </div>
  )
}

// ─── STEP 3: Analytics ───────────────────────────────────────────────────────
function Step3({ onNext, onBack }) {
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 3 of 4</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Analytics — zero setup
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        Velyr automatically sets up analytics tracking for your site. No PostHog account needed.
        After onboarding, you'll receive a small code snippet to add once — or we can auto-add it via PR.
      </p>

      <div style={{ background: 'rgba(42,92,69,0.06)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>✅ What Velyr sets up for you:</p>
        <ul style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.9, paddingLeft: 16 }}>
          <li>A dedicated analytics project for your site</li>
          <li>Pageview tracking, bounce rate, traffic sources</li>
          <li>Weekly data fed directly into the Growth Agent</li>
        </ul>
      </div>

      <div style={{ background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
        <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300, lineHeight: 1.7 }}>
          After setup, you'll get a one-line snippet to paste in your <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.06)', padding: '1px 5px', borderRadius: 4 }}>index.html</code> or <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.06)', padding: '1px 5px', borderRadius: 4 }}>main.jsx</code>.
          Alternatively the agent can open a PR and add it for you automatically.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
        <button className="ob-btn" onClick={() => onNext({})}>Continue →</button>
      </div>
    </div>
  )
}

// ─── STEP 4: Telegram ────────────────────────────────────────────────────────
function Step4({ onNext, onBack, loading }) {
  const [code, setCode]           = useState('')
  const [error, setError]         = useState('')
  const [verifying, setVerifying] = useState(false)
  const [botOpened, setBotOpened] = useState(false)

  const handleNext = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) { setError('Please enter your verification code.'); return }

    if (!/^VELYR-[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Invalid code format. It should look like VELYR-XXXXXX.')
      return
    }

    setVerifying(true)
    setError('')

    const { data: record, error: dbError } = await supabase
      .from('telegram_verification_codes')
      .select('*')
      .eq('code', trimmed)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (dbError || !record) {
      setVerifying(false)
      setError('Code not found or expired. Please go back to Telegram and type /start again.')
      return
    }

    setVerifying(false)
    onNext({ telegramCode: trimmed, telegramChatId: record.chat_id })
  }

  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Step 4 of 4</p>
      <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
        Connect Telegram
      </h2>
      <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
        The agent sends you weekly reports and PR approvals via Telegram. Connect it in 2 steps.
      </p>

      <div style={{ border: `1px solid ${botOpened ? 'rgba(42,92,69,0.3)' : C.border}`, background: botOpened ? 'rgba(42,92,69,0.04)' : '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 12, transition: 'all .3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: botOpened ? C.accent : 'transparent', border: `1px solid ${botOpened ? C.accent : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: botOpened ? '#fff' : C.textLight, fontWeight: 500, flexShrink: 0 }}>
            {botOpened ? '✓' : '1'}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Open @VelyrBot and send /start</p>
        </div>
        <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6, paddingLeft: 32, marginBottom: 14 }}>
          The bot will send you a 6-character verification code. You'll need it in step 2.
        </p>
        <div style={{ paddingLeft: 32 }}>
          <a href="https://t.me/VelyrBot" target="_blank" rel="noreferrer" className="tg-open-btn" style={{ display: 'inline-flex', width: 'auto', padding: '9px 18px' }} onClick={() => setTimeout(() => setBotOpened(true), 2000)}>
            <TelegramIcon size={16} />
            Open @VelyrBot
          </a>
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 12, padding: '16px 18px', marginBottom: 16, opacity: botOpened ? 1 : 0.5, transition: 'opacity .3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.textLight, fontWeight: 500, flexShrink: 0 }}>2</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Enter your verification code</p>
        </div>
        <div style={{ paddingLeft: 32 }}>
          <input className="ob-inp" placeholder="VELYR-XXXXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} disabled={!botOpened} style={{ fontFamily: 'DM Mono, monospace', letterSpacing: '.08em', fontSize: 16 }} onKeyDown={e => e.key === 'Enter' && handleNext()} />
        </div>
      </div>

      {!botOpened && (
        <button onClick={() => setBotOpened(true)} style={{ background: 'none', border: 'none', fontSize: 12, color: C.textLight, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 300, padding: '0 0 16px', textDecoration: 'underline' }}>
          Already have a code
        </button>
      )}

      {error && <p style={{ fontSize: 13, color: C.red, marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="ob-btn-ghost" onClick={onBack} style={{ flex: '0 0 auto', width: 'auto', padding: '14px 20px' }}>← Back</button>
        <button className="ob-btn" onClick={handleNext} disabled={loading || verifying || !botOpened}>
          {verifying ? 'Verifying…' : loading ? 'Setting up…' : 'Launch Growth Agent 🚀'}
        </button>
      </div>
    </div>
  )
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
// FIX 3: useNavigate hook instead of navigate prop
export default function AgentOnboarding({ navigate }) {
  
  const [step, setStep]         = useState(0)
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [formData, setFormData] = useState({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/agent/login'); return }
      setUser(session.user)
    })
  }, [])

  const handleStep0 = ()     => setStep(1)
  const handleStep1 = (data) => { setFormData(prev => ({ ...prev, ...data })); setStep(2) }
  const handleStep2 = (data) => { setFormData(prev => ({ ...prev, ...data })); setStep(3) }
  const handleStep3 = (data) => { setFormData(prev => ({ ...prev, ...data })); setStep(4) }

  const handleStep4 = async (data) => {
    setLoading(true)
    setError('')
    const allData = { ...formData, ...data }

    try {
      // FIX 2: Duplicate-check — prevent double subscriptions for the same user
      const { data: existingSub } = await supabase
        .from('agent_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingSub) {
        // Already has a subscription — just redirect to dashboard
        navigate('/agent/dashboard')
        return
      }

      // 1. Create subscription
      const { data: sub, error: subError } = await supabase
  .from('agent_subscriptions')
  .insert({
    user_id: user.id,
    auth_user_id: user.id,
    email: user.email,
    plan: 'growth',
    status: 'active',
    telegram_chat_id: allData.telegramChatId,  // ← hinzufügen
  })
        .select()
        .single()

      if (subError) throw subError

      // 2. Create connection
      const { error: connError } = await supabase
        .from('agent_connections')
        .insert({
          subscription_id: sub.id,
          github_installation_id: parseInt(allData.installationId),
          github_repo_owner: allData.repoOwner,
          github_repo_name: allData.repoName,
          website_url: allData.websiteUrl,
          posthog_api_key: null,
          posthog_project_id: null,
          posthog_host: 'https://eu.posthog.com',
          posthog_snippet_token: null,
          telegram_chat_id: allData.telegramChatId,
        })

      if (connError) throw connError

      // 3. Mark verification code as used
      await supabase
        .from('telegram_verification_codes')
        .update({ used: true })
        .eq('code', allData.telegramCode)

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
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Velyr</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>/ Growth Agent Setup</span>
          </div>

          <div className="ob-card ob-card-inner" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: '36px 32px', boxShadow: '0 4px 32px rgba(28,25,23,0.07)' }}>
            <StepIndicator current={step} total={5} />
            {step === 0 && <Step0 onNext={handleStep0} />}
            {step === 1 && <Step1 onNext={handleStep1} onBack={() => setStep(0)} />}
            {step === 2 && <Step2 onNext={handleStep2} onBack={() => setStep(1)} />}
            {step === 3 && <Step3 onNext={handleStep3} onBack={() => setStep(2)} />}
            {step === 4 && <Step4 onNext={handleStep4} onBack={() => setStep(3)} loading={loading} />}
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