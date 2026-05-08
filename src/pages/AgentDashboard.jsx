import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const C = {
  bg:         '#f7f4ef',
  bgCard:     '#ffffff',
  bgPanel:    '#faf8f4',
  text:       '#1c1917',
  textMuted:  '#6b6460',
  textLight:  '#a09890',
  border:     'rgba(28,25,23,0.09)',
  borderMed:  'rgba(28,25,23,0.14)',
  accent:     '#2a5c45',
  accentSoft: 'rgba(42,92,69,0.08)',
  accentMid:  'rgba(42,92,69,0.18)',
  red:        '#c0392b',
  redSoft:    'rgba(192,57,43,0.07)',
  yellow:     '#d68910',
  yellowSoft: 'rgba(214,137,16,0.08)',
  green:      '#1e8449',
  greenSoft:  'rgba(30,132,73,0.07)',
  blue:       '#2563eb',
  blueSoft:   'rgba(37,99,235,0.08)',
}

const STATUS = {
  running:          { label: 'Running',          color: C.blue,   bg: C.blueSoft,   border: 'rgba(37,99,235,0.2)',   dot: C.blue },
  waiting_approval: { label: 'Awaiting Approval', color: C.yellow, bg: C.yellowSoft, border: 'rgba(214,137,16,0.25)', dot: '#f59e0b' },
  deployed:         { label: 'Deployed',          color: C.green,  bg: C.greenSoft,  border: 'rgba(30,132,73,0.2)',   dot: '#22c55e' },
  rejected:         { label: 'Rejected',          color: C.red,    bg: C.redSoft,    border: 'rgba(192,57,43,0.2)',   dot: C.red },
  failed:           { label: 'Failed',            color: C.red,    bg: C.redSoft,    border: 'rgba(192,57,43,0.2)',   dot: C.red },
  pending:          { label: 'Pending',           color: C.textLight, bg: 'rgba(28,25,23,0.04)', border: C.border, dot: C.textLight },
  approved:         { label: 'Approved',          color: C.green,  bg: C.greenSoft,  border: 'rgba(30,132,73,0.2)',   dot: '#22c55e' },
  rolled_back:      { label: 'Rolled Back',       color: C.textMuted, bg: 'rgba(107,100,96,0.08)', border: 'rgba(107,100,96,0.2)', dot: '#6b6460' },
}

const PAGE_TYPE_EMOJI = {
  landing: '🏠', pricing: '💰', checkout: '🛒', blog: '📝',
  about: 'ℹ️', lead_magnet: '🎁', auth: '🔐', dashboard: '📊', other: '📄'
}

// Agent step definitions — simulated from run data
const AGENT_STEPS = [
  { id: 'fetch_repo',   icon: '📂', label: 'Fetching repo',         desc: 'Reading GitHub repository structure' },
  { id: 'fetch_ph',     icon: '📊', label: 'Pulling analytics',     desc: 'Loading PostHog pageview & session data' },
  { id: 'map_funnel',   icon: '🗺️', label: 'Mapping funnel',        desc: 'Detecting pages and conversion flow' },
  { id: 'analyze',      icon: '🔍', label: 'Finding biggest issue',  desc: 'Claude analyzing drop-off & opportunities' },
  { id: 'write_fix',    icon: '✍️', label: 'Writing fix',           desc: 'Editing file and generating patch' },
  { id: 'open_pr',      icon: '🔀', label: 'Opening pull request',  desc: 'Pushing branch and creating PR on GitHub' },
  { id: 'notify',       icon: '💬', label: 'Sending notification',  desc: 'Telegram message with approve/reject' },
]

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
  @keyframes slideR  { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
  @keyframes popIn   { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
  @keyframes stepIn  { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:none; } }
  @keyframes grow    { from { width:0; } to { width:100%; } }
  .fade-up  { animation: fadeUp .35s ease both; }
  .slide-r  { animation: slideR .3s ease both; }
  .pop-in   { animation: popIn .25s ease both; }
  .run-row  { transition: background .15s; cursor: pointer; }
  .run-row:hover { background: rgba(42,92,69,0.03) !important; }
  .tab-btn  { transition: all .2s; cursor: pointer; border: none; background: none; }
  .tag-pill { display:inline-flex; align-items:center; gap:6px; background:rgba(28,25,23,0.06); border:1px solid rgba(28,25,23,0.12); border-radius:20px; padding:4px 10px; font-size:12px; }
  .tag-remove { cursor:pointer; color:#a09890; font-size:14px; line-height:1; }
  .tag-remove:hover { color:#c0392b; }
  .stat-card { transition: box-shadow .2s, transform .2s; cursor: default; }
  .stat-card:hover { box-shadow: 0 6px 24px rgba(28,25,23,0.08); transform: translateY(-1px); }
  .step-row { animation: stepIn .3s ease both; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(28,25,23,0.12); border-radius: 4px; }
`

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function nextMonday9am() {
  const now = new Date()
  const day = now.getDay()
  const daysUntil = day === 1 ? (now.getHours() < 9 ? 0 : 7) : (8 - day) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntil)
  next.setHours(9, 0, 0, 0)
  return next
}

function useCountdown(target) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0, str: '' })
  useEffect(() => {
    function tick() {
      const diff = target - Date.now()
      if (diff <= 0) { setRemaining({ d:0, h:0, m:0, s:0, str: 'Running soon…' }); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const str = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
      setRemaining({ d, h, m, s, str })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return remaining
}

// Derive agent step from run status + data
function deriveAgentStep(run) {
  if (!run) return null
  switch (run.status) {
    case 'running':          return 4 // analyzing
    case 'waiting_approval': return 6 // notified, waiting
    case 'deployed':         return 6 // complete
    case 'approved':         return 6
    case 'failed':           return 3
    case 'rejected':         return 6
    case 'rolled_back':      return 6
    default:                 return 0
  }
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
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

function StatusBadge({ status, small }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{
      fontSize: small ? 10 : 11, fontWeight: 400, letterSpacing: '.04em',
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{
        width: small ? 4 : 5, height: small ? 4 : 5, borderRadius: '50%',
        background: s.dot, display: 'inline-block',
        animation: status === 'running' ? 'pulse 1.5s ease infinite' : 'none'
      }} />
      {s.label}
    </span>
  )
}

function Spinner({ size = 20 }) {
  return <div style={{ width: size, height: size, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
}

// ─── AGENT STATUS PANEL (right sticky) ───────────────────────────────────────
function AgentPanel({ subscription, runs, onTogglePause, actionLoading, onSelectRun }) {
  const isPaused = subscription?.status === 'paused'
  const isRunning = runs.some(r => r.status === 'running')
  const lastRun = runs[0] || null
  const pending = runs.filter(r => r.status === 'waiting_approval')
  const target = nextMonday9am()
  const countdown = useCountdown(target)
  const stepIdx = isRunning ? 3 : (lastRun ? deriveAgentStep(lastRun) : -1)

  // Weekly progress bar
  const now = new Date()
  const weekMs = 7 * 24 * 3600000
  const elapsed = now - new Date(target.getTime() - weekMs)
  const weekProgress = Math.min(100, Math.max(0, (elapsed / weekMs) * 100))

  return (
    <div style={{
      width: 300, flexShrink: 0,
      position: 'sticky', top: 80,
      alignSelf: 'flex-start',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>

      {/* Agent Status Card */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          background: isPaused ? C.yellowSoft : isRunning ? C.blueSoft : C.accentSoft,
          borderBottom: `1px solid ${isPaused ? 'rgba(214,137,16,0.15)' : isRunning ? 'rgba(37,99,235,0.15)' : C.accentMid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isPaused ? C.yellow : isRunning ? C.blue : C.accent,
              animation: isRunning ? 'pulse 1.5s ease infinite' : 'none',
            }} />
            <span style={{
              fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 500,
              color: isPaused ? C.yellow : isRunning ? C.blue : C.accent,
            }}>
              {isPaused ? 'Paused' : isRunning ? 'Running' : 'Idle'}
            </span>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: C.textLight }}>
            Growth Agent
          </span>
        </div>

        {/* Countdown / status */}
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
          {isPaused ? (
            <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>
              Agent is paused. Resume in Settings to run again on Monday.
            </p>
          ) : isRunning ? (
            <div>
              <p style={{ fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Currently running</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Spinner size={14} />
                <p style={{ fontSize: 13, color: C.text, fontWeight: 400 }}>Analyzing your repo…</p>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: C.textLight, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Next run in</p>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, color: C.text, letterSpacing: '.04em', marginBottom: 12 }}>
                {countdown.str}
              </p>
              {/* Week progress bar */}
              <div style={{ height: 2, background: 'rgba(42,92,69,0.1)', borderRadius: 2, marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${weekProgress}%`, background: C.accent, borderRadius: 2, transition: 'width 1s linear' }} />
              </div>
              <p style={{ fontSize: 10, color: C.textLight }}>Every Monday · 9:00 am</p>
            </div>
          )}
        </div>

        {/* Last run step breakdown */}
        {lastRun && (
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 12 }}>
              Last run · {timeAgo(lastRun.created_at)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {AGENT_STEPS.map((step, i) => {
                const done = i <= stepIdx
                const current = i === stepIdx && isRunning
                const failed = (lastRun.status === 'failed' || lastRun.status === 'rejected') && i === stepIdx

                return (
                  <div key={step.id} className="step-row" style={{
                    animationDelay: `${i * 0.05}s`,
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    paddingBottom: i < AGENT_STEPS.length - 1 ? 10 : 0,
                    position: 'relative',
                  }}>
                    {/* Connector line */}
                    {i < AGENT_STEPS.length - 1 && (
                      <div style={{
                        position: 'absolute', left: 9, top: 18, width: 1, height: 'calc(100% - 8px)',
                        background: done && !current ? C.accent : C.border,
                        opacity: done ? 0.3 : 0.5,
                      }} />
                    )}
                    {/* Step dot */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: failed ? C.red : current ? C.blue : done ? C.accent : 'rgba(28,25,23,0.06)',
                      border: `1px solid ${failed ? C.red : current ? C.blue : done ? C.accent : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: done ? '#fff' : C.textLight,
                      animation: current ? 'pulse 1.5s ease infinite' : 'none',
                      zIndex: 1,
                    }}>
                      {failed ? '✕' : done ? '✓' : ''}
                    </div>
                    <div style={{ paddingTop: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: current ? 500 : 400,
                        color: failed ? C.red : current ? C.blue : done ? C.text : C.textLight,
                        lineHeight: 1.3, marginBottom: 1,
                      }}>
                        {step.label}
                      </p>
                      {current && (
                        <p style={{ fontSize: 10, color: C.textMuted, fontWeight: 300 }}>{step.desc}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending PRs */}
        {pending.length > 0 && (
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.yellowSoft }}>
            <p style={{ fontSize: 11, color: C.yellow, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              🔔 {pending.length} awaiting approval
            </p>
            {pending.slice(0, 2).map(run => (
              <div key={run.id} onClick={() => onSelectRun(run)} style={{
                cursor: 'pointer', padding: '8px 0', borderBottom: `1px solid rgba(214,137,16,0.12)`,
              }}>
                <p style={{ fontSize: 12, color: C.text, fontWeight: 400, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {run.analysis_result?.problem || 'Fix pending review'}
                </p>
                <p style={{ fontSize: 10, color: C.textMuted, fontFamily: 'DM Mono, monospace' }}>
                  {run.pr_url ? `PR #${run.pr_number}` : ''} · {timeAgo(run.created_at)}
                </p>
              </div>
            ))}
            <p style={{ fontSize: 10, color: C.yellow, marginTop: 8, lineHeight: 1.6 }}>
              Reply <code style={{ background: 'rgba(214,137,16,0.15)', padding: '1px 5px', borderRadius: 3, fontFamily: 'DM Mono, monospace' }}>approve [id]</code> on Telegram
            </p>
          </div>
        )}

        {/* Quick actions */}
        <div style={{ padding: '14px 18px' }}>
          <button onClick={onTogglePause} disabled={actionLoading} style={{
            width: '100%', padding: '10px', borderRadius: 8, fontSize: 12,
            fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: actionLoading ? 'not-allowed' : 'pointer',
            background: isPaused ? C.accent : 'transparent',
            color: isPaused ? '#fff' : C.textMuted,
            border: `1px solid ${isPaused ? C.accent : C.border}`,
            transition: 'all .2s', opacity: actionLoading ? 0.6 : 1,
          }}>
            {actionLoading ? '…' : isPaused ? '▶ Resume Agent' : '⏸ Pause Agent'}
          </button>
        </div>
      </div>

      {/* Mini performance card */}
      <MiniPerfCard runs={runs} />
    </div>
  )
}

// ─── MINI PERF CARD ───────────────────────────────────────────────────────────
function MiniPerfCard({ runs }) {
  const deployed = runs.filter(r => r.status === 'deployed' || r.status === 'approved').length
  const total = runs.length
  const rate = total > 0 ? Math.round((deployed / total) * 100) : 0
  const pending = runs.filter(r => r.status === 'waiting_approval').length
  const failed = runs.filter(r => r.status === 'failed' || r.status === 'rejected').length

  const stats = [
    { label: 'Deploy rate',    value: `${rate}%`, color: C.green },
    { label: 'Fixes merged',   value: deployed,   color: C.accent },
    { label: 'Awaiting',       value: pending,    color: pending > 0 ? C.yellow : C.textLight },
    { label: 'Failed/rejected',value: failed,     color: failed > 0 ? C.red : C.textLight },
  ]

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 18px' }}>
      <p style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 14 }}>
        Performance
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {stats.map((s, i) => (
          <div key={i}>
            <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 26, fontWeight: 300, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: C.textLight, marginTop: 3, fontWeight: 300 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      {runs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 10, color: C.textLight, marginBottom: 6 }}>Run history</p>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28 }}>
            {[...runs].slice(0, 10).reverse().map((run, i) => {
              const s = STATUS[run.status] || STATUS.pending
              const h = run.status === 'deployed' || run.status === 'approved' ? 28
                : run.status === 'waiting_approval' ? 20
                : run.status === 'failed' || run.status === 'rejected' ? 10
                : 16
              return (
                <div key={run.id} title={`${run.status} · ${timeAgo(run.created_at)}`} style={{
                  flex: 1, height: h, background: s.dot, borderRadius: 3,
                  opacity: 0.5 + (i / 10) * 0.5, transition: 'height .3s',
                }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: C.textLight }}>oldest</span>
            <span style={{ fontSize: 9, color: C.textLight }}>latest</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ runs }) {
  const total    = runs.length
  const deployed = runs.filter(r => r.status === 'deployed' || r.status === 'approved').length
  const pending  = runs.filter(r => r.status === 'waiting_approval').length
  const failed   = runs.filter(r => r.status === 'failed' || r.status === 'rejected').length
  const rate     = total > 0 ? Math.round((deployed / total) * 100) : 0

  const cards = [
    { label: 'Total Runs',      value: total,    icon: '🔄', accent: false, highlight: false },
    { label: 'Fixes Deployed',  value: deployed, icon: '🚀', accent: true,  highlight: false },
    { label: 'Deploy Rate',     value: `${rate}%`, icon: '📈', accent: false, highlight: false },
    { label: 'Awaiting Review', value: pending,  icon: pending > 0 ? '🔔' : '✓', accent: false, highlight: pending > 0 },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
      {cards.map((card, i) => (
        <div key={i} className="stat-card fade-up" style={{
          animationDelay: `${i * 0.06}s`,
          background: card.accent ? C.accentSoft : card.highlight ? C.yellowSoft : C.bgCard,
          border: `1px solid ${card.accent ? C.accentMid : card.highlight ? 'rgba(214,137,16,0.25)' : C.border}`,
          borderRadius: 14, padding: '18px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{
              fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: 500,
              color: card.accent ? C.accent : card.highlight ? C.yellow : C.textLight,
            }}>{card.label}</p>
            <span style={{ fontSize: 15 }}>{card.icon}</span>
          </div>
          <p style={{
            fontFamily: 'Cormorant Garant, serif', fontSize: 38, fontWeight: 300,
            color: card.highlight ? C.yellow : card.accent ? C.accent : C.text, lineHeight: 1,
          }}>{card.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── RUN LIST ─────────────────────────────────────────────────────────────────
function RunList({ runs, loading, onSelect, activeFilter, onFilterChange }) {
  const filters = ['all', 'deployed', 'waiting_approval', 'failed', 'rejected']

  const filtered = activeFilter === 'all'
    ? runs
    : runs.filter(r => r.status === activeFilter)

  // Group by week
  function weekLabel(iso) {
    const d = new Date(iso), now = new Date()
    const diff = Math.floor((now - d) / 86400000)
    if (diff < 7) return 'This week'
    if (diff < 14) return 'Last week'
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }

  const grouped = []
  let cur = null
  filtered.forEach(run => {
    const lbl = weekLabel(run.created_at)
    if (!cur || cur.label !== lbl) { cur = { label: lbl, runs: [] }; grouped.push(cur) }
    cur.runs.push(run)
  })

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', flex: 1 }}>
      {/* Header + filter */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 1 }}>Activity Log</p>
          <p style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>Click any run for full details</p>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => onFilterChange(f)} style={{
              background: activeFilter === f ? C.text : 'transparent',
              color: activeFilter === f ? C.bg : C.textMuted,
              border: `1px solid ${activeFilter === f ? C.text : C.border}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 10,
              fontFamily: 'Jost, sans-serif', fontWeight: activeFilter === f ? 500 : 300,
              cursor: 'pointer', transition: 'all .15s', textTransform: 'capitalize',
              letterSpacing: '.02em',
            }}>
              {f === 'all' ? 'All' : STATUS[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 28, marginBottom: 10 }}>🤖</p>
          <p style={{ fontSize: 14, color: C.text, fontWeight: 400, marginBottom: 4 }}>
            {activeFilter === 'all' ? 'No runs yet' : `No ${STATUS[activeFilter]?.label || activeFilter} runs`}
          </p>
          <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>
            {activeFilter === 'all' ? 'The agent runs every Monday at 9am.' : 'Try changing the filter above.'}
          </p>
        </div>
      ) : (
        grouped.map((group, gi) => (
          <div key={gi}>
            {/* Week divider */}
            <div style={{ padding: '12px 20px 6px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(28,25,23,0.015)' }}>
              <span style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {group.label}
              </span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 10, color: C.textLight, fontWeight: 300 }}>{group.runs.length} run{group.runs.length !== 1 ? 's' : ''}</span>
            </div>

            {group.runs.map((run, i) => {
              const analysis = run.analysis_result || {}
              const s = STATUS[run.status] || STATUS.pending
              const isLast = i === group.runs.length - 1

              return (
                <div key={run.id} className="run-row fade-up" onClick={() => onSelect(run)}
                  style={{
                    animationDelay: `${(gi * 4 + i) * 0.03}s`,
                    display: 'flex', gap: 0,
                    background: '#fff',
                    borderBottom: !isLast ? `1px solid ${C.border}` : 'none',
                  }}
                >
                  {/* Timeline column */}
                  <div style={{ width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, flexShrink: 0, position: 'relative' }}>
                    {!isLast && (
                      <div style={{ position: 'absolute', top: 32, bottom: 0, left: '50%', width: 1, background: C.border, transform: 'translateX(-50%)' }} />
                    )}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', zIndex: 1,
                      background: s.dot, border: `2px solid #fff`,
                      boxShadow: `0 0 0 2px ${s.dot}33`,
                      animation: run.status === 'running' ? 'pulse 1.5s ease infinite' : 'none',
                    }} />
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, padding: '16px 20px 16px 0', minWidth: 0 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 400, color: C.text, lineHeight: 1.4, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {analysis.problem || 'Analysis pending…'}
                      </p>
                      <StatusBadge status={run.status} small />
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {analysis.file_to_edit && (
                        <code style={{
                          fontSize: 10, color: C.accent, fontFamily: 'DM Mono, monospace',
                          background: C.accentSoft, padding: '2px 7px', borderRadius: 4,
                          maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}>
                          {analysis.file_to_edit.split('/').pop()}
                        </code>
                      )}
                      {analysis.expected_improvement && (
                        <span style={{ fontSize: 10, color: C.green, fontWeight: 300 }}>
                          ↑ {analysis.expected_improvement}
                        </span>
                      )}
                      {run.pr_url && (
                        <a href={run.pr_url} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 10, color: C.accent, textDecoration: 'none', fontWeight: 400 }}>
                          PR #{run.pr_number} ↗
                        </a>
                      )}
                      <span style={{ fontSize: 10, color: C.textLight, fontWeight: 300, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                        {fmt(run.created_at)}
                      </span>
                    </div>

                    {/* Insight preview if available */}
                    {analysis.data_insight && (
                      <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 300, marginTop: 6, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {analysis.data_insight}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

// ─── RUN DETAIL MODAL ─────────────────────────────────────────────────────────
function RunDetail({ run, onClose }) {
  const analysis = run.analysis_result || {}
  const funnel   = run.funnel_analysis

  const fields = [
    { label: '💡 Data Insight',          text: analysis.data_insight },
    { label: '💥 Impact',                text: analysis.impact },
    { label: '✅ Solution',              text: analysis.solution },
    { label: '📈 Expected improvement',  text: analysis.expected_improvement },
    { label: '🔍 Competitor angle',      text: analysis.competitor_insight },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div className="pop-in" onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        maxWidth: 580, width: '100%', maxHeight: '88vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(28,25,23,0.18)', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textLight, lineHeight: 1 }}>×</button>

        {/* Status + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <StatusBadge status={run.status} />
          <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>
            {new Date(run.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Problem headline */}
        {analysis.problem && (
          <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 26, letterSpacing: '-.015em', marginBottom: 22, color: C.text, lineHeight: 1.2 }}>
            {analysis.problem}
          </h3>
        )}

        {/* Agent step timeline in modal */}
        <div style={{ background: 'rgba(28,25,23,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
          <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 12 }}>What the agent did</p>
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
            {AGENT_STEPS.map((step, i) => {
              const stepI = deriveAgentStep(run)
              const done = i <= stepI
              const failed = (run.status === 'failed') && i === stepI
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', fontSize: 12,
                      background: failed ? C.red : done ? C.accent : 'rgba(28,25,23,0.06)',
                      border: `1px solid ${failed ? C.red : done ? C.accent : C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 13 }}>{failed ? '✕' : done ? '✓' : step.icon}</span>
                    </div>
                    <p style={{ fontSize: 9, color: done ? C.accent : C.textLight, fontWeight: done ? 400 : 300, textAlign: 'center', maxWidth: 56, lineHeight: 1.3 }}>
                      {step.label}
                    </p>
                  </div>
                  {i < AGENT_STEPS.length - 1 && (
                    <div style={{ width: 24, height: 1, background: done ? C.accent : C.border, opacity: 0.4, flexShrink: 0, marginBottom: 20 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail fields */}
        {fields.map((item, i) => item.text && (
          <div key={i} style={{ background: 'rgba(28,25,23,0.025)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
            <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 5 }}>{item.label}</p>
            <p style={{ fontSize: 14, color: C.text, fontWeight: 300, lineHeight: 1.65 }}>{item.text}</p>
          </div>
        ))}

        {/* File edited */}
        {analysis.file_to_edit && (
          <div style={{ background: C.accentSoft, border: '1px solid rgba(42,92,69,0.2)', borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
            <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 5 }}>📄 File edited</p>
            <p style={{ fontSize: 13, color: C.text, fontFamily: 'DM Mono, monospace' }}>{analysis.file_to_edit}</p>
          </div>
        )}

        {/* Analytics snapshot */}
        {analysis.analytics_snapshot && (
          <div style={{ background: 'rgba(28,25,23,0.02)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
            <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 8 }}>📊 Analytics snapshot</p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Pageviews', value: analysis.analytics_snapshot.totalPageviews },
                { label: 'Bounce Rate', value: analysis.analytics_snapshot.bounceRate != null ? `${analysis.analytics_snapshot.bounceRate}%` : null },
                { label: 'Sessions', value: analysis.analytics_snapshot.uniqueVisitors },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: C.textLight }}>{label}</p>
                  <p style={{ fontSize: 20, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text }}>{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Funnel snapshot */}
        {funnel && (
          <div style={{ background: 'rgba(28,25,23,0.02)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
            <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 6 }}>🗺️ Funnel snapshot</p>
            <p style={{ fontSize: 13, color: C.text, fontWeight: 300 }}>{funnel.totalPages} pages · {Object.keys(funnel.pageTypes || {}).length} types</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {Object.entries(funnel.pageTypes || {}).map(([type, count]) => (
                <span key={type} style={{ fontSize: 10, background: C.accentSoft, border: '1px solid rgba(42,92,69,0.15)', borderRadius: 5, padding: '2px 7px', color: C.accent }}>
                  {PAGE_TYPE_EMOJI[type] || '📄'} {type}: {count}
                </span>
              ))}
            </div>
            {funnel.biggestDropOff && (
              <p style={{ fontSize: 11, color: C.yellow, marginTop: 8 }}>
                ⚠️ Drop-off: {funnel.biggestDropOff.filePath} ({funnel.biggestDropOff.dropOffScore}%)
              </p>
            )}
          </div>
        )}

        {/* PR button */}
        {run.pr_url && (
          <a href={run.pr_url} target="_blank" rel="noreferrer" style={{
            display: 'block', textAlign: 'center', marginTop: 22,
            background: C.text, color: C.bg, borderRadius: 10,
            padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif',
            fontWeight: 500, textDecoration: 'none', letterSpacing: '.02em', transition: 'background .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.accent}
            onMouseLeave={e => e.currentTarget.style.background = C.text}
          >View Pull Request on GitHub →</a>
        )}
      </div>
    </div>
  )
}

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={onCancel}>
      <div className="pop-in" onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: '32px 28px', maxWidth: 420, width: '100%', boxShadow: '0 24px 80px rgba(28,25,23,0.18)' }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>⚠️</p>
        <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 24, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>Delete your account?</h3>
        <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
          This permanently deletes your account, all agent runs, and all connected data. Cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, background: C.red, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Deleting…' : 'Yes, delete everything'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── GUARDRAILS PANEL ─────────────────────────────────────────────────────────
function GuardrailsPanel({ subscriptionId }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tone, setTone] = useState('')
  const [forbidden, setForbidden] = useState([])
  const [forbiddenInput, setForbiddenInput] = useState('')
  const [protected_, setProtected] = useState([])
  const [protectedInput, setProtectedInput] = useState('')
  const [customRules, setCustomRules] = useState('')

  useEffect(() => {
    if (!subscriptionId) return
    supabase.from('agent_brand_guardrails').select('*').eq('subscription_id', subscriptionId).single()
      .then(({ data }) => {
        if (data) { setTone(data.tone || ''); setForbidden(data.forbidden_patterns || []); setProtected(data.protected_elements || []); setCustomRules(data.custom_rules || '') }
      })
  }, [subscriptionId])

  function addTag(list, setList, input, setInput) {
    const val = input.trim()
    if (val && !list.includes(val)) setList([...list, val])
    setInput('')
  }
  function removeTag(list, setList, val) { setList(list.filter(v => v !== val)) }

  async function handleSave() {
    setSaving(true)
    await supabase.from('agent_brand_guardrails').upsert({ subscription_id: subscriptionId, tone: tone || null, forbidden_patterns: forbidden, protected_elements: protected_, custom_rules: customRules || null, updated_at: new Date().toISOString() }, { onConflict: 'subscription_id' })
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const inp = { width: '100%', background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 300, color: C.text, outline: 'none' }
  const lbl = { fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, display: 'block', marginBottom: 8 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.7 }}>
        These rules are enforced on every run — the agent will not make changes that violate them.
      </p>
      <div>
        <label style={lbl}>Tone of voice</label>
        <input value={tone} onChange={e => setTone(e.target.value)} placeholder='"friendly but direct", "professional, no fluff"' style={inp} />
      </div>
      {[
        { label: 'Never do these', list: forbidden, setList: setForbidden, input: forbiddenInput, setInput: setForbiddenInput, placeholder: '"clickbait headlines"' },
        { label: 'Never change these', list: protected_, setList: setProtected, input: protectedInput, setInput: setProtectedInput, placeholder: '"brand colors"' },
      ].map(({ label, list, setList, input, setInput, placeholder }) => (
        <div key={label}>
          <label style={lbl}>{label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {list.map(tag => <span key={tag} className="tag-pill">{tag}<span className="tag-remove" onClick={() => removeTag(list, setList, tag)}>×</span></span>)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag(list, setList, input, setInput)} placeholder={`e.g. ${placeholder} — press Enter`} style={{ ...inp, flex: 1 }} />
            <button onClick={() => addTag(list, setList, input, setInput)} style={{ background: C.text, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer' }}>Add</button>
          </div>
        </div>
      ))}
      <div>
        <label style={lbl}>Additional rules</label>
        <textarea value={customRules} onChange={e => setCustomRules(e.target.value)} placeholder="Any other instructions for the agent..." rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
      </div>
      <button onClick={handleSave} disabled={saving} style={{ background: saved ? C.green : C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'background .3s' }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Guardrails'}
      </button>
    </div>
  )
}

// ─── FUNNEL PANEL ─────────────────────────────────────────────────────────────
function FunnelPanel({ subscriptionId }) {
  const [funnelPages, setFunnelPages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subscriptionId) return
    supabase.from('agent_funnel_pages').select('*').eq('subscription_id', subscriptionId).order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => {
        if (data) {
          const seen = new Set()
          setFunnelPages(data.filter(p => { if (seen.has(p.page_path)) return false; seen.add(p.page_path); return true }))
        }
        setLoading(false)
      })
  }, [subscriptionId])

  if (loading) return <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
  if (!funnelPages.length) return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p style={{ fontSize: 28, marginBottom: 12 }}>🗺️</p>
      <p style={{ fontSize: 14, color: C.text, fontWeight: 400, marginBottom: 4 }}>No funnel data yet</p>
      <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>Funnel analysis runs automatically every Monday.</p>
    </div>
  )

  const biggestOpportunity = [...funnelPages].filter(p => p.drop_off_score > 0).sort((a, b) => b.drop_off_score - a.drop_off_score)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {biggestOpportunity && (
        <div style={{ background: C.yellowSoft, border: '1px solid rgba(214,137,16,0.25)', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: C.yellow, fontWeight: 500, marginBottom: 6 }}>⚠️ Biggest Drop-off</p>
          <p style={{ fontSize: 14, color: C.text, fontWeight: 400, marginBottom: 3 }}>{PAGE_TYPE_EMOJI[biggestOpportunity.page_type]} {biggestOpportunity.page_path}</p>
          <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>{biggestOpportunity.drop_off_score}% drop-off · {biggestOpportunity.views_7d} views/week</p>
          <p style={{ fontSize: 11, color: C.textLight, marginTop: 6, fontStyle: 'italic' }}>The agent will prioritize this page on the next run.</p>
        </div>
      )}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{funnelPages.length} pages detected</p>
        </div>
        {funnelPages.map((page, i) => {
          const dropOffColor = page.drop_off_score >= 60 ? C.red : page.drop_off_score >= 30 ? C.yellow : C.green
          return (
            <div key={page.id} style={{ padding: '13px 18px', borderBottom: i < funnelPages.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{PAGE_TYPE_EMOJI[page.page_type] || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, color: C.text, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_path}</p>
                <p style={{ fontSize: 10, color: C.textLight, marginTop: 2, textTransform: 'capitalize' }}>{page.page_type}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {page.views_7d > 0 && <p style={{ fontSize: 12, color: C.text, fontWeight: 400 }}>{page.views_7d} views</p>}
                {page.drop_off_score > 0 && <p style={{ fontSize: 10, color: dropOffColor, marginTop: 2 }}>{page.drop_off_score}% drop-off</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function AgentDashboard({ navigate }) {
  const [user, setUser]                   = useState(null)
  const [authLoading, setAuthLoading]     = useState(true)
  const [runs, setRuns]                   = useState([])
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState(null)
  const [subscription, setSubscription]   = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab]         = useState('runs')
  const [runFilter, setRunFilter]         = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/agent/login'); return }
      setUser(session.user); setAuthLoading(false)
    })
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { navigate('/agent/login'); return }
      setUser(session.user); setAuthLoading(false)
    })
    return () => authSub.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [user])

  async function fetchData() {
    const { data: subs } = await supabase.from('agent_subscriptions').select('*').eq('auth_user_id', user.id).single()
    setSubscription(subs)
    if (!subs) { setLoading(false); return }
    const { data: runsData } = await supabase.from('agent_runs').select('*').eq('subscription_id', subs.id).order('created_at', { ascending: false }).limit(50)
    if (runsData) setRuns(runsData)
    setLoading(false)
  }

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function handleTogglePause() {
    setActionLoading(true)
    const token = await getToken()
    const action = subscription?.status === 'paused' ? 'resume' : 'pause'
    const res = await fetch(`/api/agent/run?action=${action}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) setSubscription(prev => ({ ...prev, status: data.status }))
    setActionLoading(false)
  }

  async function handleDeleteAccount() {
    setActionLoading(true)
    const token = await getToken()
    const res = await fetch('/api/agent/run?action=delete', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) { await supabase.auth.signOut(); navigate('/') }
    else { setActionLoading(false); setShowDeleteConfirm(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/agent/login')
  }

  const pending = runs.filter(r => r.status === 'waiting_approval').length

  const tabs = [
    { id: 'runs',       label: 'Runs' },
    { id: 'funnel',     label: '🗺️ Funnel' },
    { id: 'guardrails', label: '🛡️ Guardrails' },
    { id: 'settings',   label: 'Settings' },
  ]

  if (authLoading) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={24} />
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      {selected && <RunDetail run={selected} onClose={() => setSelected(null)} />}
      {showDeleteConfirm && <DeleteConfirmModal onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteConfirm(false)} loading={actionLoading} />}

      <div style={{ minHeight: '100vh', background: C.bg }}>

        {/* ── NAV ── */}
        <nav style={{
          height: 60, padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(247,244,239,0.93)', backdropFilter: 'blur(16px)',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <Logo size={22} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Velyr</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300, marginLeft: 4 }}>/ Growth Agent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {pending > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.yellowSoft, border: '1px solid rgba(214,137,16,0.25)', borderRadius: 8, padding: '5px 12px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.yellow, animation: 'pulse 1.5s ease infinite' }} />
                <span style={{ fontSize: 11, color: C.yellow, fontWeight: 400 }}>{pending} awaiting approval</span>
              </div>
            )}
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>{user?.email}</span>
            <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 13px', fontSize: 11, fontFamily: 'Jost, sans-serif', fontWeight: 300, color: C.textMuted, cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted }}
            >Log out</button>
          </div>
        </nav>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 80px' }}>

          {/* No subscription */}
          {!loading && !subscription && (
            <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: '48px 32px', textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
              <p style={{ fontSize: 36, marginBottom: 16 }}>🤖</p>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 30, letterSpacing: '-.015em', marginBottom: 12, color: C.text }}>Set up your Growth Agent</h2>
              <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 28 }}>
                Connect your website and GitHub repo to start optimizing automatically.
              </p>
              <button onClick={() => navigate('/agent/onboarding')} style={{ background: C.text, color: C.bg, border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.accent}
                onMouseLeave={e => e.currentTarget.style.background = C.text}
              >Start setup →</button>
            </div>
          )}

          {subscription && (
            <>
              {/* Page header */}
              <div className="fade-up" style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: C.accent, marginBottom: 8, fontWeight: 500 }}>
                  Growth Agent Dashboard
                </p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(26px, 3.5vw, 42px)', letterSpacing: '-.025em', lineHeight: 1.1, color: C.text }}>
                    Your website,{' '}<em style={{ fontStyle: 'italic', color: C.accent }}>always improving.</em>
                  </h1>
                  <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>
                    Auto-refreshes every 30s
                  </p>
                </div>
              </div>

              {/* Pending alert */}
              {pending > 0 && (
                <div className="fade-up" style={{ background: C.yellowSoft, border: '1px solid rgba(214,137,16,0.25)', borderRadius: 12, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18 }}>💬</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 400, color: C.text, marginBottom: 2 }}>
                      {pending} PR{pending > 1 ? 's are' : ' is'} waiting for your approval
                    </p>
                    <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 300 }}>
                      Reply <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 3 }}>approve [id]</code> or <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 3 }}>reject [id]</code> on Telegram
                    </p>
                  </div>
                  <button onClick={() => { setActiveTab('runs'); setRunFilter('waiting_approval') }} style={{ background: C.yellow, color: '#fff', border: 'none', borderRadius: 7, padding: '7px 13px', fontSize: 11, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                    Review →
                  </button>
                </div>
              )}

              {/* Stats bar */}
              {!loading && <StatsBar runs={runs} />}

              {/* Main 2-column layout */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                {/* LEFT — tab content */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>

                  {/* Tab nav */}
                  <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 16, gap: 0, overflowX: 'auto' }}>
                    {tabs.map(tab => (
                      <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                        padding: '10px 16px', fontSize: 12,
                        fontFamily: 'Jost, sans-serif', fontWeight: activeTab === tab.id ? 500 : 300,
                        color: activeTab === tab.id ? C.text : C.textLight,
                        borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
                        marginBottom: -1, whiteSpace: 'nowrap', letterSpacing: '.01em',
                      }}>{tab.label}</button>
                    ))}
                  </div>

                  {/* ── RUNS TAB ── */}
                  {activeTab === 'runs' && (
                    <div className="fade-up">
                      <RunList
                        runs={runs}
                        loading={loading}
                        onSelect={setSelected}
                        activeFilter={runFilter}
                        onFilterChange={setRunFilter}
                      />
                    </div>
                  )}

                  {/* ── FUNNEL TAB ── */}
                  {activeTab === 'funnel' && (
                    <div className="fade-up">
                      <div style={{ marginBottom: 14 }}>
                        <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300, lineHeight: 1.7 }}>
                          The agent automatically detects all pages in your repo and maps the conversion funnel. Pages with high drop-off are prioritized on the next run.
                        </p>
                      </div>
                      <FunnelPanel subscriptionId={subscription?.id} />
                    </div>
                  )}

                  {/* ── GUARDRAILS TAB ── */}
                  {activeTab === 'guardrails' && (
                    <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px' }}>
                      <GuardrailsPanel subscriptionId={subscription?.id} />
                    </div>
                  )}

                  {/* ── SETTINGS TAB ── */}
                  {activeTab === 'settings' && (
                    <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                      {/* Pause/Resume */}
                      <div style={{ padding: '20px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 400, color: C.text, marginBottom: 3 }}>
                            {subscription.status === 'paused' ? '⏸ Agent is paused' : '▶ Agent is active'}
                          </p>
                          <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>
                            {subscription.status === 'paused' ? 'Resume to run again every Monday.' : 'Pause temporarily without losing data.'}
                          </p>
                        </div>
                        <button onClick={handleTogglePause} disabled={actionLoading} style={{
                          background: subscription.status === 'paused' ? C.accent : 'transparent',
                          color: subscription.status === 'paused' ? '#fff' : C.textMuted,
                          border: `1px solid ${subscription.status === 'paused' ? C.accent : C.border}`,
                          borderRadius: 8, padding: '8px 16px', fontSize: 12, fontFamily: 'Jost, sans-serif', fontWeight: 400,
                          cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, transition: 'all .2s', whiteSpace: 'nowrap',
                        }}>
                          {actionLoading ? '…' : subscription.status === 'paused' ? 'Resume Agent' : 'Pause Agent'}
                        </button>
                      </div>
                      {/* Account */}
                      <div style={{ padding: '20px 22px', borderBottom: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 13, fontWeight: 400, color: C.text, marginBottom: 8 }}>Account</p>
                        <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300, marginBottom: 2 }}>Email: {user?.email}</p>
                        <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>Plan: {subscription.plan || 'Growth'}</p>
                      </div>
                      {/* Delete */}
                      <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 400, color: C.red, marginBottom: 3 }}>Delete account</p>
                          <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>Permanently deletes your account and all data.</p>
                        </div>
                        <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'transparent', color: C.red, border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer', transition: 'all .2s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >Delete account</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT — Sticky Agent Panel */}
                <AgentPanel
                  subscription={subscription}
                  runs={runs}
                  onTogglePause={handleTogglePause}
                  actionLoading={actionLoading}
                  onSelectRun={setSelected}
                />
              </div>

              {/* How it works footer */}
              <div className="fade-up" style={{ marginTop: 20, background: C.accentSoft, border: `1px solid ${C.accentMid}`, borderRadius: 14, padding: '18px 22px' }}>
                <p style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 12 }}>How it works</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                  {[
                    'Every Monday at 9am, the agent reads your GitHub repo + analytics',
                    'It detects all pages and maps your conversion funnel automatically',
                    'Claude finds the biggest drop-off — respecting your Brand Guardrails',
                    'It writes the fix and opens a Pull Request on GitHub',
                    'You get a Telegram message — reply approve [id] to merge',
                    'After 48h the agent checks metrics — auto-rolls back if no improvement',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: C.accent, color: '#fff', fontSize: 9, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <p style={{ fontSize: 11, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}