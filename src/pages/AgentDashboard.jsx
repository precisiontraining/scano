import { useEffect, useState } from 'react'
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
  waiting_approval: { label: 'Awaiting Approval', color: '#d68910', bg: 'rgba(214,137,16,0.08)',  border: 'rgba(214,137,16,0.25)' },
  deployed:         { label: 'Deployed',          color: '#1e8449', bg: 'rgba(30,132,73,0.07)',   border: 'rgba(30,132,73,0.2)'   },
  rejected:         { label: 'Rejected',          color: '#c0392b', bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)'   },
  failed:           { label: 'Failed',            color: '#c0392b', bg: 'rgba(192,57,43,0.07)',   border: 'rgba(192,57,43,0.2)'   },
  pending:          { label: 'Pending',           color: '#a09890', bg: 'rgba(28,25,23,0.04)',    border: 'rgba(28,25,23,0.09)'   },
  approved:         { label: 'Approved',          color: '#1e8449', bg: 'rgba(30,132,73,0.07)',   border: 'rgba(30,132,73,0.2)'   },
  rolled_back:      { label: 'Rolled Back',       color: '#6b6460', bg: 'rgba(107,100,96,0.08)',  border: 'rgba(107,100,96,0.2)'  },
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
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  .agent-card { animation: fadeUp .4s ease both; }
  .run-row { transition: background .15s; cursor: pointer; }
  .run-row:hover { background: rgba(42,92,69,0.03) !important; }
  .tab-btn { transition: all .2s; cursor: pointer; }
  .tag-pill { display:inline-flex; align-items:center; gap:6px; background:rgba(28,25,23,0.06); border:1px solid rgba(28,25,23,0.12); border-radius:20px; padding:4px 10px; font-size:12px; }
  .tag-remove { cursor:pointer; color:#a09890; font-size:14px; line-height:1; }
  .tag-remove:hover { color:#c0392b; }
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
  const funnel = run.funnel_analysis
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
              { label: '💡 Data Insight', text: analysis.data_insight },
              { label: '💥 Impact', text: analysis.impact },
              { label: '✅ Solution', text: analysis.solution },
              { label: '📈 Expected improvement', text: analysis.expected_improvement },
              { label: '🔍 Competitor angle', text: analysis.competitor_insight },
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

            {/* Funnel snapshot in run detail */}
            {funnel && (
              <div style={{ background: 'rgba(28,25,23,0.02)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 8 }}>🗺️ Funnel at time of run</p>
                <p style={{ fontSize: 13, color: C.text, fontWeight: 300 }}>{funnel.totalPages} pages detected</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {Object.entries(funnel.pageTypes || {}).map(([type, count]) => (
                    <span key={type} style={{ fontSize: 11, background: 'rgba(42,92,69,0.07)', border: '1px solid rgba(42,92,69,0.15)', borderRadius: 6, padding: '2px 8px', color: C.accent }}>
                      {PAGE_TYPE_EMOJI[type] || '📄'} {type}: {count}
                    </span>
                  ))}
                </div>
                {funnel.biggestDropOff && (
                  <p style={{ fontSize: 12, color: C.yellow, marginTop: 8 }}>
                    ⚠️ Biggest drop-off: {funnel.biggestDropOff.filePath} ({funnel.biggestDropOff.dropOffScore}%)
                  </p>
                )}
              </div>
            )}

            {analysis.analytics_snapshot && (
              <div style={{ background: 'rgba(28,25,23,0.02)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 15px', marginBottom: 10 }}>
                <p style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: C.textLight, fontWeight: 500, marginBottom: 8 }}>📊 Analytics at time of run</p>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>Pageviews</p>
                    <p style={{ fontSize: 16, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text }}>{analysis.analytics_snapshot.totalPageviews ?? '—'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>Bounce Rate</p>
                    <p style={{ fontSize: 16, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text }}>{analysis.analytics_snapshot.bounceRate != null ? `${analysis.analytics_snapshot.bounceRate}%` : '—'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: C.textLight, fontWeight: 300 }}>Sessions</p>
                    <p style={{ fontSize: 16, fontFamily: 'Cormorant Garant, serif', fontWeight: 400, color: C.text }}>{analysis.analytics_snapshot.uniqueVisitors ?? '—'}</p>
                  </div>
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

function DeleteConfirmModal({ onConfirm, onCancel, loading }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(28,25,23,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, padding: '32px 28px',
        maxWidth: 420, width: '100%',
        boxShadow: '0 24px 80px rgba(28,25,23,0.18)',
      }}>
        <p style={{ fontSize: 28, marginBottom: 12 }}>⚠️</p>
        <h3 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 24, letterSpacing: '-.015em', marginBottom: 8, color: C.text }}>
          Delete your account?
        </h3>
        <p style={{ fontSize: 14, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 24 }}>
          This will permanently delete your account, all agent runs, and all connected data. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{
            flex: 1, background: 'transparent', color: C.text,
            border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif',
            fontWeight: 400, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            flex: 1, background: C.red, color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '13px', fontSize: 14, fontFamily: 'Jost, sans-serif',
            fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}>
            {loading ? 'Deleting…' : 'Yes, delete everything'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── BRAND GUARDRAILS PANEL ────────────────────────────────────────────────────
function GuardrailsPanel({ subscriptionId }) {
  const [guardrails, setGuardrails] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [tone, setTone] = useState('')
  const [forbidden, setForbidden] = useState([])
  const [forbiddenInput, setForbiddenInput] = useState('')
  const [protected_, setProtected] = useState([])
  const [protectedInput, setProtectedInput] = useState('')
  const [customRules, setCustomRules] = useState('')

  useEffect(() => {
    if (!subscriptionId) return
    supabase.from('agent_brand_guardrails')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTone(data.tone || '')
          setForbidden(data.forbidden_patterns || [])
          setProtected(data.protected_elements || [])
          setCustomRules(data.custom_rules || '')
          setGuardrails(data)
        }
      })
  }, [subscriptionId])

  function addTag(list, setList, input, setInput) {
    const val = input.trim()
    if (val && !list.includes(val)) setList([...list, val])
    setInput('')
  }

  function removeTag(list, setList, val) {
    setList(list.filter(v => v !== val))
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('agent_brand_guardrails').upsert({
      subscription_id: subscriptionId,
      tone: tone || null,
      forbidden_patterns: forbidden,
      protected_elements: protected_,
      custom_rules: customRules || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'subscription_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle = {
    width: '100%', background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'Jost, sans-serif',
    fontWeight: 300, color: C.text, outline: 'none',
  }

  const labelStyle = {
    fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase',
    color: C.textLight, fontWeight: 500, display: 'block', marginBottom: 8,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 20 }}>
          Brand guardrails tell the agent what it can and cannot change. These rules are enforced on every run — the agent will reject any suggestion that violates them.
        </p>
      </div>

      {/* Tone */}
      <div>
        <label style={labelStyle}>Tone of voice</label>
        <input
          value={tone}
          onChange={e => setTone(e.target.value)}
          placeholder='e.g. "friendly but direct", "professional, no fluff"'
          style={inputStyle}
        />
      </div>

      {/* Forbidden patterns */}
      <div>
        <label style={labelStyle}>Never do these</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {forbidden.map(tag => (
            <span key={tag} className="tag-pill">
              {tag}
              <span className="tag-remove" onClick={() => removeTag(forbidden, setForbidden, tag)}>×</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={forbiddenInput}
            onChange={e => setForbiddenInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag(forbidden, setForbidden, forbiddenInput, setForbiddenInput)}
            placeholder='e.g. "clickbait headlines" — press Enter to add'
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => addTag(forbidden, setForbidden, forbiddenInput, setForbiddenInput)} style={{
            background: C.text, color: C.bg, border: 'none', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, fontFamily: 'Jost, sans-serif',
            fontWeight: 400, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Add</button>
        </div>
      </div>

      {/* Protected elements */}
      <div>
        <label style={labelStyle}>Never change these</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {protected_.map(tag => (
            <span key={tag} className="tag-pill">
              {tag}
              <span className="tag-remove" onClick={() => removeTag(protected_, setProtected, tag)}>×</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={protectedInput}
            onChange={e => setProtectedInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag(protected_, setProtected, protectedInput, setProtectedInput)}
            placeholder='e.g. "brand colors", "logo placement" — press Enter to add'
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={() => addTag(protected_, setProtected, protectedInput, setProtectedInput)} style={{
            background: C.text, color: C.bg, border: 'none', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, fontFamily: 'Jost, sans-serif',
            fontWeight: 400, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Add</button>
        </div>
      </div>

      {/* Custom rules */}
      <div>
        <label style={labelStyle}>Additional rules (freeform)</label>
        <textarea
          value={customRules}
          onChange={e => setCustomRules(e.target.value)}
          placeholder='Any other instructions for the agent...'
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
        />
      </div>

      <button onClick={handleSave} disabled={saving} style={{
        background: saved ? C.green : C.accent, color: '#fff',
        border: 'none', borderRadius: 10, padding: '13px',
        fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 500,
        cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.7 : 1, transition: 'background .3s',
      }}>
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Guardrails'}
      </button>
    </div>
  )
}

// ─── FUNNEL OVERVIEW PANEL ────────────────────────────────────────────────────
function FunnelPanel({ subscriptionId }) {
  const [funnelPages, setFunnelPages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!subscriptionId) return

    // Get most recent funnel pages
    supabase.from('agent_funnel_pages')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          // Deduplicate by page_path, keep most recent
          const seen = new Set()
          const unique = data.filter(p => {
            if (seen.has(p.page_path)) return false
            seen.add(p.page_path)
            return true
          })
          setFunnelPages(unique)
        }
        setLoading(false)
      })
  }, [subscriptionId])

  if (loading) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <div style={{ width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
    </div>
  )

  if (funnelPages.length === 0) return (
    <div style={{ padding: '32px', textAlign: 'center' }}>
      <p style={{ fontSize: 32, marginBottom: 12 }}>🗺️</p>
      <p style={{ fontSize: 15, color: C.text, fontWeight: 400, marginBottom: 6 }}>No funnel data yet</p>
      <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>Funnel analysis runs automatically every Monday with the agent.</p>
    </div>
  )

  // Group by type for summary
  const byType = {}
  funnelPages.forEach(p => {
    if (!byType[p.page_type]) byType[p.page_type] = []
    byType[p.page_type].push(p)
  })

  const biggestOpportunity = [...funnelPages]
    .filter(p => p.drop_off_score > 0)
    .sort((a, b) => b.drop_off_score - a.drop_off_score)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {biggestOpportunity && (
        <div style={{
          background: 'rgba(214,137,16,0.07)', border: '1px solid rgba(214,137,16,0.25)',
          borderRadius: 12, padding: '16px 18px',
        }}>
          <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.yellow, fontWeight: 500, marginBottom: 6 }}>⚠️ Biggest Drop-off</p>
          <p style={{ fontSize: 14, color: C.text, fontWeight: 400, marginBottom: 3 }}>
            {PAGE_TYPE_EMOJI[biggestOpportunity.page_type]} {biggestOpportunity.page_path}
          </p>
          <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>
            {biggestOpportunity.drop_off_score}% of visitors drop off here · {biggestOpportunity.views_7d} views/week
          </p>
          <p style={{ fontSize: 12, color: C.textLight, marginTop: 6, fontStyle: 'italic' }}>
            The agent will prioritize this page on the next run.
          </p>
        </div>
      )}

      {/* Page list */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{funnelPages.length} pages detected in your repo</p>
        </div>
        {funnelPages.map((page, i) => {
          const dropOffColor = page.drop_off_score >= 60 ? C.red
            : page.drop_off_score >= 30 ? C.yellow
            : C.green
          return (
            <div key={page.id} style={{
              padding: '14px 18px',
              borderBottom: i < funnelPages.length - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{PAGE_TYPE_EMOJI[page.page_type] || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: C.text, fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {page.page_path}
                </p>
                <p style={{ fontSize: 11, color: C.textLight, marginTop: 2, textTransform: 'capitalize' }}>{page.page_type}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {page.views_7d > 0 && (
                  <p style={{ fontSize: 13, color: C.text, fontWeight: 400 }}>{page.views_7d} views</p>
                )}
                {page.drop_off_score > 0 && (
                  <p style={{ fontSize: 11, color: dropOffColor, marginTop: 2 }}>
                    {page.drop_off_score}% drop-off
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AgentDashboard({ navigate }) {
  const [user, setUser]               = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [runs, setRuns]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab]     = useState('runs') // 'runs' | 'funnel' | 'guardrails' | 'settings'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/agent/login'); return }
      setUser(session.user)
      setAuthLoading(false)
    })

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { navigate('/agent/login'); return }
      setUser(session.user)
      setAuthLoading(false)
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
    const { data: subs } = await supabase
      .from('agent_subscriptions')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    setSubscription(subs)

    if (!subs) { setLoading(false); return }

    const { data: runsData } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('subscription_id', subs.id)
      .order('created_at', { ascending: false })
      .limit(20)

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

    const res = await fetch(`/api/agent/run?action=${action}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await res.json()
    if (data.success) {
      setSubscription(prev => ({ ...prev, status: data.status }))
    }
    setActionLoading(false)
  }

  async function handleDeleteAccount() {
    setActionLoading(true)
    const token = await getToken()

    const res = await fetch('/api/agent/run?action=delete', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await res.json()
    if (data.success) {
      await supabase.auth.signOut()
      navigate('/')
    } else {
      setActionLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/agent/login')
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

  const tabs = [
    { id: 'runs',       label: 'Runs' },
    { id: 'funnel',     label: '🗺️ Funnel' },
    { id: 'guardrails', label: '🛡️ Brand Guardrails' },
    { id: 'settings',   label: 'Settings' },
  ]

  if (authLoading) return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      {selected && <RunDetail run={selected} onClose={() => setSelected(null)} />}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={actionLoading}
        />
      )}

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
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: C.text }}>Velyr</span>
            <span style={{ fontSize: 11, color: C.textLight, fontWeight: 300, marginLeft: 4 }}>/ Growth Agent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: C.textLight, fontWeight: 300 }}>{user?.email}</span>
            <button onClick={handleLogout} style={{
              background: 'none', border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontFamily: 'Jost, sans-serif',
              fontWeight: 300, color: C.textMuted, cursor: 'pointer', transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.red; e.currentTarget.style.color = C.red }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted }}
            >Log out</button>
          </div>
        </nav>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 0' }}>

          {/* No subscription */}
          {!loading && !subscription && (
            <div className="agent-card" style={{
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 18, padding: '48px 32px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 32, marginBottom: 16 }}>🤖</p>
              <h2 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 400, fontSize: 28, letterSpacing: '-.015em', marginBottom: 12, color: C.text }}>
                Set up your Growth Agent
              </h2>
              <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 28, maxWidth: 400, margin: '0 auto 28px' }}>
                Connect your website and GitHub repo to start optimizing automatically.
              </p>
              <button onClick={() => navigate('/agent/onboarding')} style={{
                background: C.text, color: C.bg, border: 'none', borderRadius: 10,
                padding: '14px 28px', fontSize: 14, fontFamily: 'Jost, sans-serif',
                fontWeight: 500, cursor: 'pointer', letterSpacing: '.02em', transition: 'background .2s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = C.accent}
                onMouseLeave={e => e.currentTarget.style.background = C.text}
              >Start setup →</button>
            </div>
          )}

          {subscription && (
            <>
              {/* Header */}
              <div className="agent-card" style={{ marginBottom: 40 }}>
                <p style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: C.accent, marginBottom: 12, fontWeight: 400 }}>Growth Agent</p>
                <h1 style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 300, fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '-.025em', lineHeight: 1.08, color: C.text, marginBottom: 12 }}>
                  Your website,<br /><em style={{ fontStyle: 'italic', color: C.accent }}>always improving.</em>
                </h1>
                <p style={{ fontSize: 15, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, maxWidth: 480 }}>
                  The agent scans your repo every week, finds the biggest conversion problem, writes the fix, and sends it for your approval.
                </p>
              </div>

              {/* Paused banner */}
              {subscription.status === 'paused' && (
                <div className="agent-card" style={{
                  animationDelay: '0.1s',
                  background: 'rgba(214,137,16,0.07)', border: '1px solid rgba(214,137,16,0.25)',
                  borderRadius: 14, padding: '16px 20px', marginBottom: 24,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 18 }}>⏸</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 2 }}>Agent is paused</p>
                    <p style={{ fontSize: 12, color: C.textMuted, fontWeight: 300 }}>The agent won't run on Monday. Your data is safe. Resume anytime.</p>
                  </div>
                  <button onClick={handleTogglePause} disabled={actionLoading} style={{
                    background: C.accent, color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 13, fontFamily: 'Jost, sans-serif',
                    fontWeight: 500, cursor: 'pointer', flexShrink: 0,
                  }}>Resume</button>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Runs',      value: runs.length, sub: 'since setup',        accent: false },
                  { label: 'Deployed Fixes',  value: deployed,    sub: 'improvements merged', accent: true  },
                  { label: 'Awaiting Review', value: pending,     sub: 'reply on Telegram',   accent: false },
                ].map((s, i) => (
                  <div key={i} className="agent-card" style={{
                    animationDelay: `${i * 0.05}s`,
                    background: s.accent ? 'rgba(42,92,69,0.06)' : C.bgCard,
                    border: `1px solid ${s.accent ? 'rgba(42,92,69,0.2)' : C.border}`,
                    borderRadius: 14, padding: '22px 24px', flex: 1, minWidth: 140,
                  }}>
                    <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: s.accent ? C.accent : C.textLight, fontWeight: 400, marginBottom: 8 }}>{s.label}</p>
                    <p style={{ fontFamily: 'Cormorant Garant, serif', fontSize: 44, fontWeight: 300, color: C.text, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontSize: 12, color: C.textMuted, marginTop: 6, fontWeight: 300 }}>{s.sub}</p>
                  </div>
                ))}
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
                      Reply <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 4 }}>approve [id]</code> or <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, background: 'rgba(28,25,23,0.07)', padding: '1px 5px', borderRadius: 4 }}>reject [id]</code> to the Velyr Telegram bot
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="agent-card" style={{
                animationDelay: '0.2s',
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 16, overflow: 'hidden',
              }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 8px' }}>
                  {tabs.map(tab => (
                    <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '16px 16px', fontSize: 13,
                      fontFamily: 'Jost, sans-serif', fontWeight: activeTab === tab.id ? 500 : 300,
                      color: activeTab === tab.id ? C.text : C.textLight,
                      borderBottom: `2px solid ${activeTab === tab.id ? C.accent : 'transparent'}`,
                      marginBottom: -1,
                    }}>{tab.label}</button>
                  ))}
                </div>

                {/* Tab: Runs */}
                {activeTab === 'runs' && (
                  <>
                    <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.border}` }}>
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
                        <p style={{ fontSize: 13, color: C.textLight, fontWeight: 300 }}>The agent runs automatically every Monday at 9am.</p>
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
                              {run.funnel_analysis?.totalPages ? ` · ${run.funnel_analysis.totalPages} pages scanned` : ''}
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
                  </>
                )}

                {/* Tab: Funnel */}
                {activeTab === 'funnel' && (
                  <div style={{ padding: '24px' }}>
                    <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.7, marginBottom: 20 }}>
                      The agent automatically detects all pages in your repo and maps the conversion funnel. Pages with high drop-off are prioritized in the next run.
                    </p>
                    <FunnelPanel subscriptionId={subscription?.id} />
                  </div>
                )}

                {/* Tab: Guardrails */}
                {activeTab === 'guardrails' && (
                  <div style={{ padding: '24px' }}>
                    <GuardrailsPanel subscriptionId={subscription?.id} />
                  </div>
                )}

                {/* Tab: Settings */}
                {activeTab === 'settings' && (
                  <>
                    {/* Pause / Resume */}
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 400, color: C.text, marginBottom: 4 }}>
                          {subscription.status === 'paused' ? '⏸ Agent is paused' : '▶ Agent is active'}
                        </p>
                        <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>
                          {subscription.status === 'paused'
                            ? 'Resume to let the agent run again every Monday.'
                            : 'Pause if you want to stop the agent temporarily without losing your data.'}
                        </p>
                      </div>
                      <button onClick={handleTogglePause} disabled={actionLoading} style={{
                        background: subscription.status === 'paused' ? C.accent : 'transparent',
                        color: subscription.status === 'paused' ? '#fff' : C.textMuted,
                        border: `1px solid ${subscription.status === 'paused' ? C.accent : C.border}`,
                        borderRadius: 8, padding: '9px 18px', fontSize: 13,
                        fontFamily: 'Jost, sans-serif', fontWeight: 400,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.6 : 1,
                        transition: 'all .2s', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>
                        {actionLoading ? '...' : subscription.status === 'paused' ? 'Resume Agent' : 'Pause Agent'}
                      </button>
                    </div>

                    {/* Delete */}
                    <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 400, color: C.red, marginBottom: 4 }}>Delete account</p>
                        <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300 }}>
                          Permanently deletes your account and all data. This cannot be undone.
                        </p>
                      </div>
                      <button onClick={() => setShowDeleteConfirm(true)} style={{
                        background: 'transparent', color: C.red,
                        border: '1px solid rgba(192,57,43,0.3)',
                        borderRadius: 8, padding: '9px 18px', fontSize: 13,
                        fontFamily: 'Jost, sans-serif', fontWeight: 400,
                        cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >Delete account</button>
                    </div>
                  </>
                )}
              </div>

              {/* How it works */}
              <div className="agent-card" style={{
                animationDelay: '0.3s', marginTop: 20,
                background: 'rgba(42,92,69,0.05)', border: '1px solid rgba(42,92,69,0.15)',
                borderRadius: 14, padding: '20px 24px',
              }}>
                <p style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: C.accent, fontWeight: 500, marginBottom: 12 }}>How it works</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'Every Monday at 9am, the agent reads your GitHub repo + analytics',
                    'It detects all pages and maps your conversion funnel automatically',
                    'Claude finds the biggest drop-off or conversion problem — respecting your Brand Guardrails',
                    'It writes the fix and opens a Pull Request on GitHub',
                    'You get a Telegram message — reply approve [id] to merge',
                    'After 48h, the agent checks if metrics improved — and auto-rolls back if not',
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.accent, color: '#fff', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <p style={{ fontSize: 13, color: C.textMuted, fontWeight: 300, lineHeight: 1.6 }}>{text}</p>
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