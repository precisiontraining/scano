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
  red:       '#c0392b',
  yellow:    '#d68910',
  green:     '#1e8449',
}

const STATUS = {
  running:          { label: 'Running',          color: '#3b82f6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)'  },
  waiting_approval: { label: 'Awaiting Approval', color: C.yellow, bg: 'rgba(214,137,16,0.08)',  border: 'rgba(214,137,16,0.25)' },
  deployed:         { label: 'Deployed',          color: C.green,  bg: 'rgba(30,132,73,0.07)',   border: 'rgba(30,132,73,0.2)'   },
  rejected:         { label: 'Rejected',          color: C.red,    bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)'   },
  failed:           { label: 'Failed',            color: C.red,    bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)'   },
  pending:          { label: 'Pending',           color: C.textLight, bg: 'rgba(28,25,23,0.04)', border: C.border                },
  approved:         { label: 'Approved',          color: C.green,  bg: 'rgba(30,132,73,0.07)',   border: 'rgba(30,132,73,0.2)'   },
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&family=DM+Mono:wght@400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  .agent-card { animation: fadeUp .4s ease both; }
  .run-row { transition: background .15s; cursor: pointer; }
  .run-row:hover { background: rgba(42,92,69,0.03) !important; }
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

function StatCard({ label, value, sub, accent, delay }) {
  return (
    <div className="agent-card" style={{
      animationDelay: `${delay}s`,
      background: accent ? 'rgba(42,92,69,0.06)' : C.bgCard,
      border: `1px solid ${accent ? 'rgba(42,92,69,0.2)' : C.border}`,
      borderRadius: 14, padding: '22px 24px', flex: 1, minWidth: 140,
    }}>
      <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: accent ? C.accent : C.textLight, fontWeight: 400, marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 44, fontWeight: 300, color: C.text, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontWeight: 300 }}>{sub}</p>}
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 400, letterSpacing: '.05em',
      padding: '3px 10px', borderRadius: 6,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function RunDetail({ run, onClose }) {
  const analysis = run.analysis_result || {}
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
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
              { label: '💥 Impact', text: analysis.impact },
              { label: '✅ Solution', text: analysis.solution },
              { label: '📈 Expected improvement', text: analysis.expected_improvement },
            ].map((item, i) => item.text && (
              <div key={i} style={{ background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 5 }}>{item.label}</p>
                <p style={{ fontSize: 14, color: C.text, fontWeight: 300, lineHeight: 1.65 }}>{item.text}</p>
              </div>
            ))}

            {analysis.file_to_edit && (
              <div style={{ background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.2)', borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 5 }}>📄 File edited</p>
                <p style={{ fontSize: 13, color: C.text, fontFamily: 'DM Mono, monospace' }}>{analysis.file_to_edit}</p>
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

export default function AgentDashboard({ navigate }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchRuns() {
    const { data } = await supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setRuns(data)
    setLoading(false)
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'just now'
  }

  const deployed = runs.filter(r => r.status === 'deployed').length
  const pending  = runs.filter(r => r.status === 'waiting_approval').length

  return (
    <>
      <style>{CSS}</style>
      {selected && <RunDetail run={selected} onClose={() => setSelected(null)} />}

      <div style={{ minHeight: '100vh', background: C.bg, padding: '0 0 80px' }}>

        {/* Nav */}
        <nav style={{
          height: 60, padding: '0 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`,
          background: 'rgba(247,244,239,0.93)', backdropFilter: 'blur(16px)',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <Logo size={22} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Scano</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300, marginLeft: 4 }}>/ Growth Agent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>Active · runs every Monday</span>
          </div>
        </nav>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 0' }}>

          {/* Header */}
          <div className="agent-card" style={{ marginBottom: 40 }}>
            <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Growth Agent</p>
            <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-.025em', lineHeight: 1.08, color: C.text, marginBottom: 12 }}>
              Your website,<br /><em style={{ fontStyle: 'italic', color: C.accent }}>always improving.</em>
            </h1>
            <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, maxWidth: 480 }}>
              The agent scans your repo every week, finds the biggest conversion problem, writes the fix, and sends it to you for approval.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <StatCard label="Total Runs"      value={runs.length} sub="since setup"          delay={0.05} />
            <StatCard label="Deployed Fixes"  value={deployed}    sub="improvements merged"  delay={0.1}  accent />
            <StatCard label="Awaiting Review" value={pending}      sub="reply on Telegram"    delay={0.15} />
          </div>

          {/* Pending alert */}
          {pending > 0 && (
            <div className="agent-card" style={{
              animationDelay: '0.2s',
              background: 'rgba(214,137,16,0.07)', border: '1px solid rgba(214,137,16,0.25)',
              borderRadius: 14, padding: '16px 20px', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 2 }}>
                  {pending} PR{pending > 1 ? 's' : ''} waiting for your approval
                </p>
                <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>
                  Reply <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 4 }}>approve [id]</code> or <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 4 }}>reject [id]</code> to the Scano Telegram bot
                </p>
              </div>
            </div>
          )}

          {/* Runs table */}
          <div className="agent-card" style={{
            animationDelay: '0.2s',
            background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>Agent Runs</p>
              <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>Click a row to see details</p>
            </div>

            {loading ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>Loading runs…</p>
              </div>
            ) : runs.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 12 }}>🤖</p>
                <p style={{ fontSize: 15, color: C.text, fontWeight: 400, marginBottom: 6 }}>No runs yet</p>
                <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>The agent will run automatically every Monday at 9am.</p>
              </div>
            ) : (
              runs.map((run, i) => (
                <div key={run.id} className="run-row" onClick={() => setSelected(run)} style={{
                  padding: '16px 24px',
                  borderBottom: i < runs.length - 1 ? `1px solid ${C.border}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                  background: '#fff',
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 3, lineHeight: 1.4 }}>
                      {run.analysis_result?.problem || 'Analysis pending…'}
                    </p>
                    <p style={{ fontSize: 12, color: C.textLight, fontWeight: 300, fontFamily: 'DM Mono, monospace' }}>
                      {run.id.substring(0, 8)}…
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <StatusBadge status={run.status} />
                    {run.pr_url && (
                      <a href={run.pr_url} target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: 12, color: C.accent, textDecoration: 'none', fontWeight: 400, whiteSpace: 'nowrap' }}>
                        PR #{run.pr_number} ↗
                      </a>
                    )}
                    <span style={{ fontSize: 12, color: C.textLight, fontWeight: 300, whiteSpace: 'nowrap' }}>{timeAgo(run.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Info box */}
          <div className="agent-card" style={{
            animationDelay: '0.3s',
            marginTop: 20,
            background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.15)',
            borderRadius: 14, padding: '20px 24px',
          }}>
            <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 12 }}>How it works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { step: '1', text: 'Every Monday at 9am, the agent reads your GitHub repo and analytics' },
                { step: '2', text: 'Claude finds the biggest conversion problem in your code' },
                { step: '3', text: 'It writes the fix, creates a branch, and opens a Pull Request' },
                { step: '4', text: 'You receive a Telegram message with the problem, solution, and PR link' },
                { step: '5', text: 'Reply approve [id] to merge it — or reject [id] to skip' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{item.step}</div>
                  <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}