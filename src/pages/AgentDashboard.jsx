import { useEffect, useState, useRef } from 'react'
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
  accentSoft:'rgba(42,92,69,0.08)',
  red:       '#c0392b',
  yellow:    '#d68910',
  green:     '#1e8449',
  blue:      '#2563eb',
}

const STATUS = {
  running:          { label: 'Running',          color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.2)',  dot: '#2563eb' },
  waiting_approval: { label: 'Awaiting Approval', color: '#d68910', bg: 'rgba(214,137,16,0.08)',  border: 'rgba(214,137,16,0.25)', dot: '#f59e0b' },
  deployed:         { label: 'Deployed',          color: '#1e8449', bg: 'rgba(30,132,73,0.07)',   border: 'rgba(30,132,73,0.2)',   dot: '#22c55e' },
  rejected:         { label: 'Rejected',          color: '#c0392b', bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)',   dot: '#c0392b' },
  failed:           { label: 'Failed',            color: '#c0392b', bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)',   dot: '#c0392b' },
  pending:          { label: 'Pending',           color: '#a09890', bg: 'rgba(28,25,23,0.04)',    border: 'rgba(28,25,23,0.09)',   dot: '#a09890' },
  approved:         { label: 'Approved',          color: '#1e8449', bg: 'rgba(30,132,73,0.07)',   border: 'rgba(30,132,73,0.2)',   dot: '#22c55e' },
  rolled_back:      { label: 'Rolled Back',       color: '#6b6460', bg: 'rgba(107,100,96,0.08)',  border: 'rgba(107,100,96,0.2)',  dot: '#6b6460' },
}

const PAGE_TYPE_EMOJI = {
  landing: '🏠', pricing: '💰', checkout: '🛒', blog: '📝',
  about: 'ℹ️', lead_magnet: '🎁', auth: '🔐', dashboard: '📊', other: '📄'
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
  @keyframes slideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
  @keyframes popIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
  .fade-up { animation: fadeUp .35s ease both; }
  .slide-in { animation: slideIn .3s ease both; }
  .pop-in { animation: popIn .25s ease both; }
  .run-row { transition: background .15s, border-color .15s; cursor: pointer; }
  .run-row:hover { background: rgba(42,92,69,0.025) !important; }
  .tab-btn { transition: all .2s; cursor: pointer; border: none; }
  .tag-pill { display:inline-flex; align-items:center; gap:6px; background:rgba(28,25,23,0.06); border:1px solid rgba(28,25,23,0.12); border-radius:20px; padding:4px 10px; font-size:12px; }
  .tag-remove { cursor:pointer; color:#a09890; font-size:14px; line-height:1; }
  .tag-remove:hover { color:#c0392b; }
  .action-btn { transition: all .15s; cursor: pointer; }
  .action-btn:hover { transform: translateY(-1px); }
  .stat-card { transition: box-shadow .2s; }
  .stat-card:hover { box-shadow: 0 4px 20px rgba(28,25,23,0.08); }
  .timeline-dot { flex-shrink: 0; }
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
  const [remaining, setRemaining] = useState('')
  useEffect(() => {
    function tick() {
      const diff = target - Date.now()
      if (diff <= 0) { setRemaining('Running soon…'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setRemaining(`${d}d ${h}h ${m}m`)
      else if (h > 0) setRemaining(`${h}h ${m}m ${s}s`)
      else setRemaining(`${m}m ${s}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return remaining
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
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

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 400, letterSpacing: '.04em',
      padding: '3px 9px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block', animation: status === 'running' ? 'pulse 1.5s ease infinite' : 'none' }} />
      {s.label}
    </span>
  )
}

function Spinner({ size = 20 }) {
  return <div style={{ width: size, height: size, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
}

// ─── COUNTDOWN CARD ───────────────────────────────────────────────────────────
function CountdownCard({ isPaused }) {
  const target = nextMonday9am()
  const remaining = useCountdown(target)
  const now = new Date()
  const totalMs = target - new Date(now.getTime() - (7 * 24 * 3600000))
  const elapsed = now - new Date(target.getTime() - (7 * 24 * 3600000))
  const progress = Math.min(100, Math.max(0, (elapsed / totalMs) * 100))

  return (
    <div style={{
      background: isPaused ? 'rgba(214,137,16,0.05)' : C.accentSoft,
      border: `1px solid ${isPaused ? 'rgba(214,137,16,0.2)' : 'rgba(42,92,69,0.18)'}`,
      borderRadius: 14, padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: isPaused ? C.yellow : C.accent, fontWeight: 500 }}>
          {isPaused ? '⏸ Agent Paused' : '⏱ Next Run'}
        </p>
        {!isPaused && <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>Every Monday 9am</span>}
      </div>
      {isPaused ? (
        <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300 }}>Agent is paused. Go to Settings to resume.</p>
      ) : (
        <>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, color: C.text, letterSpacing: '.05em', marginBottom: 12 }}>
            {remaining}
          </p>
          <div style={{ height: 3, background: 'rgba(42,92,69,0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.accent, borderRadius: 3, transition: 'width 1s linear' }} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── LAST ACTION CARD ─────────────────────────────────────────────────────────
function LastActionCard({ run, onClick }) {
  if (!run) return null
  const analysis = run.analysis_result || {}
  const s = STATUS[run.status] || STATUS.pending

  return (
    <div onClick={onClick} style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '20px 22px', cursor: 'pointer',
      transition: 'box-shadow .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(28,25,23,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500 }}>Last Run</p>
        <StatusBadge status={run.status} />
      </div>

      {analysis.problem && (
        <p style={{ fontSize: 14, color: C.text, fontWeight: 400, lineHeight: 1.5, marginBottom: 10 }}>
          {analysis.problem}
        </p>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {analysis.file_to_edit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: C.textLight }}>📄</span>
            <code style={{ fontSize: 11, color: C.accent, fontFamily: 'DM Mono, monospace', background: C.accentSoft, padding: '2px 7px', borderRadius: 4 }}>
              {analysis.file_to_edit.split('/').pop()}
            </code>
          </div>
        )}
        {run.pr_url && (
          <a href={run.pr_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            style={{ fontSize: 11, color: C.accent, fontWeight: 400, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            PR #{run.pr_number} ↗
          </a>
        )}
        <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300, marginLeft: 'auto' }}>{timeAgo(run.created_at)}</span>
      </div>
    </div>
  )
}

// ─── ACTIVITY TIMELINE ────────────────────────────────────────────────────────
function ActivityTimeline({ runs, onSelect }) {
  if (!runs.length) return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <p style={{ fontSize: 32, marginBottom: 10 }}>🤖</p>
      <p style={{ fontSize: 15, color: C.text, fontWeight: 400, marginBottom: 6 }}>No runs yet</p>
      <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>The agent runs every Monday at 9am.</p>
    </div>
  )

  // Group runs by week
  function getWeekLabel(iso) {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now - d) / 86400000)
    if (diffDays < 7) return 'This week'
    if (diffDays < 14) return 'Last week'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const grouped = []
  let currentGroup = null
  runs.forEach(run => {
    const label = getWeekLabel(run.created_at)
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, runs: [] }
      grouped.push(currentGroup)
    }
    currentGroup.runs.push(run)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {grouped.map((group, gi) => (
        <div key={gi}>
          {/* Week label */}
          <div style={{ padding: '16px 24px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500 }}>{group.label}</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {group.runs.map((run, i) => {
            const analysis = run.analysis_result || {}
            const s = STATUS[run.status] || STATUS.pending
            const isLast = gi === grouped.length - 1 && i === group.runs.length - 1

            return (
              <div key={run.id} className="run-row slide-in" onClick={() => onSelect(run)}
                style={{
                  animationDelay: `${(gi * 3 + i) * 0.04}s`,
                  display: 'flex', gap: 0, position: 'relative',
                  background: '#fff',
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {/* Timeline line + dot */}
                <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, flexShrink: 0, position: 'relative' }}>
                  {!isLast && <div style={{ position: 'absolute', top: 32, bottom: -1, left: '50%', width: 1, background: C.border, transform: 'translateX(-50%)' }} />}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.dot, border: `2px solid #fff`, boxShadow: `0 0 0 2px ${s.dot}22`, zIndex: 1, animation: run.status === 'running' ? 'pulse 1.5s ease infinite' : 'none' }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '16px 20px 16px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 13, fontWeight: 400, color: C.text, lineHeight: 1.4, flex: 1, minWidth: 180 }}>
                      {analysis.problem || 'Analysis pending…'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <StatusBadge status={run.status} />
                      {run.pr_url && (
                        <a href={run.pr_url} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 11, color: C.accent, textDecoration: 'none', fontWeight: 400 }}>
                          PR #{run.pr_number} ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {analysis.file_to_edit && (
                      <code style={{ fontSize: 11, color: C.textMuted, fontFamily: 'DM Mono, monospace', background: 'rgba(28,25,23,0.04)', padding: '2px 7px', borderRadius: 4 }}>
                        {analysis.file_to_edit}
                      </code>
                    )}
                    {analysis.expected_improvement && (
                      <span style={{ fontSize: 11, color: C.green, fontWeight: 300 }}>
                        ↑ {analysis.expected_improvement}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300, marginLeft: 'auto' }}>
                      {new Date(run.created_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {timeAgo(run.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── PERFORMANCE TREND ────────────────────────────────────────────────────────
function PerformanceTrend({ runs }) {
  const deployed = runs.filter(r => r.status === 'deployed' || r.status === 'approved')
  const total = runs.length
  const deployRate = total > 0 ? Math.round((deployed.length / total) * 100) : 0

  // Simple sparkline from run statuses
  const last8 = [...runs].slice(0, 8).reverse()

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px' }}>
      <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 16 }}>
        Performance Overview
      </p>

      <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 28, fontFamily: 'Cormorant Garant, serif', fontWeight: 300, color: C.text, lineHeight: 1 }}>{deployed.length}</p>
          <p style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>fixes deployed</p>
        </div>
        <div>
          <p style={{ fontSize: 28, fontFamily: 'Cormorant Garant, serif', fontWeight: 300, color: C.text, lineHeight: 1 }}>{deployRate}%</p>
          <p style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>deploy rate</p>
        </div>
        <div>
          <p style={{ fontSize: 28, fontFamily: 'Cormorant Garant, serif', fontWeight: 300, color: C.text, lineHeight: 1 }}>{total}</p>
          <p style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>total runs</p>
        </div>
      </div>

      {/* Sparkline dots */}
      {last8.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: C.textLight, marginBottom: 8 }}>Run history (oldest → newest)</p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 32 }}>
            {last8.map((run, i) => {
              const s = STATUS[run.status] || STATUS.pending
              return (
                <div key={run.id} title={`${run.status} · ${timeAgo(run.created_at)}`} style={{
                  flex: 1, height: run.status === 'deployed' || run.status === 'approved' ? 28
                    : run.status === 'waiting_approval' ? 20
                    : run.status === 'failed' || run.status === 'rejected' ? 14
                    : 18,
                  background: s.dot,
                  borderRadius: 4,
                  opacity: 0.7 + (i / last8.length) * 0.3,
                  transition: 'height .3s ease',
                  cursor: 'default',
                }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: C.textLight }}>older</span>
            <span style={{ fontSize: 10, color: C.textLight }}>latest</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── RUN DETAIL MODAL ─────────────────────────────────────────────────────────
function RunDetail({ run, onClose }) {
  const analysis = run.analysis_result || {}
  const funnel = run.funnel_analysis

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div className="pop-in" onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px',
        maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(28,25,23,0.18)', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textLight, lineHeight: 1 }}>×</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <StatusBadge status={run.status} />
          <span style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>
            {new Date(run.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {analysis.problem && (
          <>
            <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 24, letterSpacing: '-.015em', marginBottom: 20, color: C.text, lineHeight: 1.2 }}>
              {analysis.problem}
            </h3>

            {[
              { label: '💡 Data Insight',           text: analysis.data_insight },
              { label: '💥 Impact',                 text: analysis.impact },
              { label: '✅ Solution',               text: analysis.solution },
              { label: '📈 Expected improvement',   text: analysis.expected_improvement },
              { label: '🔍 Competitor angle',       text: analysis.competitor_insight },
            ].map((item, i) => item.text && (
              <div key={i} style={{ background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 5 }}>{item.label}</p>
                <p style={{ fontSize: 14, color: C.text, fontWeight: 300, lineHeight: 1.65 }}>{item.text}</p>
              </div>
            ))}

            {analysis.file_to_edit && (
              <div style={{ background: C.accentSoft, border: '1px solid rgba(42,92,69,0.2)', borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 5 }}>📄 File edited</p>
                <p style={{ fontSize: 13, color: C.text, fontFamily: 'DM Mono, monospace' }}>{analysis.file_to_edit}</p>
              </div>
            )}

            {funnel && (
              <div style={{ background: 'rgba(28,25,23,0.02)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 8 }}>🗺️ Funnel snapshot</p>
                <p style={{ fontSize: 13, color: C.text, fontWeight: 300 }}>{funnel.totalPages} pages · {Object.keys(funnel.pageTypes || {}).length} types</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {Object.entries(funnel.pageTypes || {}).map(([type, count]) => (
                    <span key={type} style={{ fontSize: 11, background: C.accentSoft, border: '1px solid rgba(42,92,69,0.15)', borderRadius: 6, padding: '2px 8px', color: C.accent }}>
                      {PAGE_TYPE_EMOJI[type] || '📄'} {type}: {count}
                    </span>
                  ))}
                </div>
                {funnel.biggestDropOff && (
                  <p style={{ fontSize: 12, color: C.yellow, marginTop: 8 }}>
                    ⚠️ Drop-off: {funnel.biggestDropOff.filePath} ({funnel.biggestDropOff.dropOffScore}%)
                  </p>
                )}
              </div>
            )}

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
                      <p style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>{label}</p>
                      <p style={{ fontSize: 16, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text }}>{value ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {run.pr_url && (
          <a href={run.pr_url} target="_blank" rel="noreferrer" style={{
            display: 'block', textAlign: 'center', marginTop: 20,
            background: C.text, color: C.bg, borderRadius: 10,
            padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif',
            fontWeight: 500, textDecoration: 'none', letterSpacing: '.02em',
            transition: 'background .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.accent}
            onMouseLeave={e => e.currentTarget.style.background = C.text}
          >View Pull Request on GitHub →</a>
        )}
      </div>
    </div>
  )
}

// ─── DELETE CONFIRM ───────────────────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onCancel}>
      <div className="pop-in" onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, padding: '32px 28px',
        maxWidth: 420, width: '100%',
        boxShadow: '0 24px 80px rgba(28,25,23,0.18)',
      }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>⚠️</p>
        <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 24, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
          Delete your account?
        </h3>
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
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [tone, setTone]               = useState('')
  const [forbidden, setForbidden]     = useState([])
  const [forbiddenInput, setForbiddenInput] = useState('')
  const [protected_, setProtected]    = useState([])
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
  const lbl = { fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, display: 'block', marginBottom: 8 }

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
        { label: 'Never change these', list: protected_, setList: setProtected, input: protectedInput, setInput: setProtectedInput, placeholder: '"brand colors", "logo placement"' },
      ].map(({ label, list, setList, input, setInput, placeholder }) => (
        <div key={label}>
          <label style={lbl}>{label}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {list.map(tag => (
              <span key={tag} className="tag-pill">{tag}<span className="tag-remove" onClick={() => removeTag(list, setList, tag)}>×</span></span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag(list, setList, input, setInput)} placeholder={`e.g. ${placeholder} — press Enter`} style={{ ...inp, flex: 1 }} />
            <button onClick={() => addTag(list, setList, input, setInput)} style={{ background: C.text, color: C.bg, border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>Add</button>
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
  const [loading, setLoading]         = useState(true)

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

  if (loading) return <div style={{ padding: '32px', textAlign: 'center' }}><Spinner /></div>
  if (!funnelPages.length) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>🗺️</p>
      <p style={{ fontSize: 15, color: C.text, fontWeight: 400, marginBottom: 6 }}>No funnel data yet</p>
      <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>Funnel analysis runs automatically every Monday.</p>
    </div>
  )

  const biggestOpportunity = [...funnelPages].filter(p => p.drop_off_score > 0).sort((a, b) => b.drop_off_score - a.drop_off_score)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {biggestOpportunity && (
        <div style={{ background: 'rgba(214,137,16,0.07)', border: '1px solid rgba(214,137,16,0.25)', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.yellow, fontWeight: 500, marginBottom: 6 }}>⚠️ Biggest Drop-off</p>
          <p style={{ fontSize: 14, color: C.text, fontWeight: 400, marginBottom: 3 }}>{PAGE_TYPE_EMOJI[biggestOpportunity.page_type]} {biggestOpportunity.page_path}</p>
          <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>{biggestOpportunity.drop_off_score}% drop-off · {biggestOpportunity.views_7d} views/week</p>
          <p style={{ fontSize: 12, color: C.textLight, marginTop: 6, fontStyle: 'italic' }}>The agent will prioritize this page on the next run.</p>
        </div>
      )}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{funnelPages.length} pages detected</p>
        </div>
        {funnelPages.map((page, i) => {
          const dropOffColor = page.drop_off_score >= 60 ? C.red : page.drop_off_score >= 30 ? C.yellow : C.green
          return (
            <div key={page.id} style={{ padding: '14px 18px', borderBottom: i < funnelPages.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{PAGE_TYPE_EMOJI[page.page_type] || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: C.text, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.page_path}</p>
                <p style={{ fontSize: 11, color: C.textLight, marginTop: 2, textTransform: 'capitalize' }}>{page.page_type}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {page.views_7d > 0 && <p style={{ fontSize: 13, color: C.text, fontWeight: 400 }}>{page.views_7d} views</p>}
                {page.drop_off_score > 0 && <p style={{ fontSize: 11, color: dropOffColor, marginTop: 2 }}>{page.drop_off_score}% drop-off</p>}
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
  const [activeTab, setActiveTab]         = useState('overview')

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
    const { data: runsData } = await supabase.from('agent_runs').select('*').eq('subscription_id', subs.id).order('created_at', { ascending: false }).limit(20)
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

  const pending  = runs.filter(r => r.status === 'waiting_approval').length
  const deployed = runs.filter(r => r.status === 'deployed').length
  const lastRun  = runs[0] || null

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'timeline',   label: 'Activity' },
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

      <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>

        {/* Nav */}
        <nav style={{ height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`, background: 'rgba(247,244,239,0.93)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <Logo size={22} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Velyr</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300, marginLeft: 4 }}>/ Growth Agent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {pending > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(214,137,16,0.1)', border: '1px solid rgba(214,137,16,0.25)', borderRadius: 8, padding: '5px 12px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.yellow, animation: 'pulse 1.5s ease infinite' }} />
                <span style={{ fontSize: 12, color: C.yellow, fontWeight: 400 }}>{pending} awaiting approval</span>
              </div>
            )}
            <span style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>{user?.email}</span>
            <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 12, fontFamily: 'Jost, sans-serif', fontWeight: 300, color: C.textMuted, cursor: 'pointer', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted }}
            >Log out</button>
          </div>
        </nav>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 0' }}>

          {/* No subscription */}
          {!loading && !subscription && (
            <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, padding: '48px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: 32, marginBottom: 16 }}>🤖</p>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 12, color: C.text }}>Set up your Growth Agent</h2>
              <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
                Connect your website and GitHub repo to start optimizing automatically.
              </p>
              <button onClick={() => navigate('/agent/onboarding')} className="action-btn" style={{ background: C.text, color: C.bg, border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500, letterSpacing: '.02em', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = C.accent}
                onMouseLeave={e => e.currentTarget.style.background = C.text}
              >Start setup →</button>
            </div>
          )}

          {subscription && (
            <>
              {/* Page header */}
              <div className="fade-up" style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: C.accent, marginBottom: 10, fontWeight: 400 }}>Growth Agent Dashboard</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(28px, 4vw, 46px)', letterSpacing: '-.025em', lineHeight: 1.1, color: C.text }}>
                    Your website,<br /><em style={{ fontStyle: 'italic', color: C.accent }}>always improving.</em>
                  </h1>
                  {subscription.status === 'paused' && (
                    <button onClick={handleTogglePause} disabled={actionLoading} className="action-btn" style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                      ▶ Resume Agent
                    </button>
                  )}
                </div>
              </div>

              {/* Pending approval alert */}
              {pending > 0 && (
                <div className="fade-up" style={{ animationDelay: '0.05s', background: 'rgba(214,137,16,0.07)', border: '1px solid rgba(214,137,16,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>💬</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 2 }}>
                      {pending} PR{pending > 1 ? 's are' : ' is'} waiting for your approval
                    </p>
                    <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>
                      Reply <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 4 }}>approve [id]</code> or <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 4 }}>reject [id]</code> to @VelyrBot on Telegram
                    </p>
                  </div>
                  <button onClick={() => setActiveTab('timeline')} style={{ background: C.yellow, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontFamily: 'Jost, sans-serif', fontWeight: 500, cursor: 'pointer', flexShrink: 0 }}>
                    View runs
                  </button>
                </div>
              )}

              {/* Tab Nav */}
              <div className="fade-up" style={{ animationDelay: '0.08s', display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 28, gap: 0, overflowX: 'auto' }}>
                {tabs.map(tab => (
                  <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                    background: 'none', padding: '12px 18px', fontSize: 13,
                    fontFamily: 'Jost, sans-serif', fontWeight: activeTab === tab.id ? 500 : 300,
                    color: activeTab === tab.id ? C.text : C.textLight,
                    borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
                    marginBottom: -1, whiteSpace: 'nowrap',
                  }}>{tab.label}</button>
                ))}
              </div>

              {/* ── TAB: OVERVIEW ─────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="fade-up" style={{ animationDelay: '0.1s' }}>

                  {/* Top row: countdown + last action */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
                    <CountdownCard isPaused={subscription.status === 'paused'} />
                    {lastRun
                      ? <LastActionCard run={lastRun} onClick={() => setSelected(lastRun)} />
                      : (
                        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>No runs yet — first run on Monday 9am</p>
                        </div>
                      )
                    }
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Total Runs',      value: runs.length, sub: 'since setup',          accent: false, icon: '🔄' },
                      { label: 'Deployed Fixes',  value: deployed,    sub: 'improvements merged',   accent: true,  icon: '🚀' },
                      { label: 'Awaiting Review', value: pending,     sub: 'reply on Telegram',     accent: false, icon: pending > 0 ? '🔔' : '✓' },
                    ].map((s, i) => (
                      <div key={i} className="stat-card fade-up" style={{
                        animationDelay: `${0.12 + i * 0.04}s`,
                        background: s.accent ? 'rgba(42,92,69,0.06)' : pending > 0 && i === 2 ? 'rgba(214,137,16,0.05)' : C.bgCard,
                        border: `1px solid ${s.accent ? 'rgba(42,92,69,0.2)' : pending > 0 && i === 2 ? 'rgba(214,137,16,0.2)' : C.border}`,
                        borderRadius: 14, padding: '20px 22px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <p style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: s.accent ? C.accent : C.textLight, fontWeight: 500 }}>{s.label}</p>
                          <span style={{ fontSize: 16 }}>{s.icon}</span>
                        </div>
                        <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 40, fontWeight: 300, color: C.text, lineHeight: 1 }}>{s.value}</p>
                        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontWeight: 300 }}>{s.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Performance trend + recent runs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16 }}>
                    <PerformanceTrend runs={runs} />

                    {/* Recent runs quick view */}
                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>Recent runs</p>
                        <button onClick={() => setActiveTab('timeline')} style={{ background: 'none', border: 'none', fontSize: 12, color: C.accent, cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontWeight: 400 }}>View all →</button>
                      </div>
                      {loading ? (
                        <div style={{ padding: '32px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                      ) : runs.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center' }}>
                          <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>No runs yet</p>
                        </div>
                      ) : (
                        runs.slice(0, 5).map((run, i) => (
                          <div key={run.id} className="run-row" onClick={() => setSelected(run)} style={{ padding: '13px 20px', borderBottom: i < Math.min(runs.length, 5) - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12, background: '#fff' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, color: C.text, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                                {run.analysis_result?.problem || 'Pending…'}
                              </p>
                              <p style={{ fontSize: 11, color: C.textLight, fontFamily: 'DM Mono, monospace' }}>{timeAgo(run.created_at)}</p>
                            </div>
                            <StatusBadge status={run.status} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: TIMELINE ─────────────────────────────────────────── */}
              {activeTab === 'timeline' && (
                <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 2 }}>Activity Timeline</p>
                      <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>Click any run for full details</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {Object.entries(STATUS).filter(([k]) => ['deployed','waiting_approval','failed'].includes(k)).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: v.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: v.dot, display: 'inline-block' }} />
                          {v.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {loading
                    ? <div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}><Spinner /></div>
                    : <ActivityTimeline runs={runs} onSelect={setSelected} />
                  }
                </div>
              )}

              {/* ── TAB: FUNNEL ───────────────────────────────────────────── */}
              {activeTab === 'funnel' && (
                <div className="fade-up">
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.7 }}>
                      The agent automatically detects all pages in your repo and maps the conversion funnel. Pages with high drop-off are prioritized on the next run.
                    </p>
                  </div>
                  <FunnelPanel subscriptionId={subscription?.id} />
                </div>
              )}

              {/* ── TAB: GUARDRAILS ───────────────────────────────────────── */}
              {activeTab === 'guardrails' && (
                <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px' }}>
                  <GuardrailsPanel subscriptionId={subscription?.id} />
                </div>
              )}

              {/* ── TAB: SETTINGS ─────────────────────────────────────────── */}
              {activeTab === 'settings' && (
                <div className="fade-up" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                  {/* Pause */}
                  <div style={{ padding: '22px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 4 }}>
                        {subscription.status === 'paused' ? '⏸ Agent is paused' : '▶ Agent is active'}
                      </p>
                      <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>
                        {subscription.status === 'paused' ? 'Resume to let the agent run again every Monday.' : 'Pause temporarily without losing your data.'}
                      </p>
                    </div>
                    <button onClick={handleTogglePause} disabled={actionLoading} style={{
                      background: subscription.status === 'paused' ? C.accent : 'transparent',
                      color: subscription.status === 'paused' ? '#fff' : C.textMuted,
                      border: `1px solid ${subscription.status === 'paused' ? C.accent : C.border}`,
                      borderRadius: 8, padding: '9px 18px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 400,
                      cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, transition: 'all .2s', whiteSpace: 'nowrap',
                    }}>
                      {actionLoading ? '…' : subscription.status === 'paused' ? 'Resume Agent' : 'Pause Agent'}
                    </button>
                  </div>

                  {/* Connected repo info */}
                  <div style={{ padding: '22px 24px', borderBottom: `1px solid ${C.border}` }}>
                    <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 4 }}>Account</p>
                    <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, marginBottom: 2 }}>Email: {user?.email}</p>
                    <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>Plan: {subscription.plan || 'Growth'}</p>
                  </div>

                  {/* Delete */}
                  <div style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 400, color: C.red, marginBottom: 4 }}>Delete account</p>
                      <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>Permanently deletes your account and all data. Cannot be undone.</p>
                    </div>
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'transparent', color: C.red, border: '1px solid rgba(192,57,43,0.3)', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >Delete account</button>
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="fade-up" style={{ animationDelay: '0.2s', marginTop: 20, background: C.accentSoft, border: '1px solid rgba(42,92,69,0.15)', borderRadius: 14, padding: '20px 24px' }}>
                <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 14 }}>How it works</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                  {[
                    'Every Monday at 9am, the agent reads your GitHub repo + analytics',
                    'It detects all pages and maps your conversion funnel automatically',
                    'Claude finds the biggest drop-off — respecting your Brand Guardrails',
                    'It writes the fix and opens a Pull Request on GitHub',
                    'You get a Telegram message — reply approve [id] to merge',
                    'After 48h the agent checks metrics — auto-rolls back if no improvement',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.accent, color: '#fff', fontSize: 10, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>{text}</p>
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