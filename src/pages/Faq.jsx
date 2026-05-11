import { useEffect } from 'react'

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  h1 { font-family: 'Cormorant Garant', serif; font-weight: 300; font-size: clamp(36px, 5vw, 56px); letter-spacing: -.025em; line-height: 1.08; }
  h2 { font-family: 'Cormorant Garant', serif; font-weight: 400; font-size: 22px; letter-spacing: -.015em; margin-bottom: 14px; color: #1c1917; }
  p, li { color: #6b6460; line-height: 1.78; font-size: 15px; font-weight: 300; }
  a { color: #2a5c45; text-decoration: underline; text-decoration-color: rgba(42,92,69,0.35); transition: color .2s; }
  a:hover { color: #1e4433; }
`

const FAQS = [
  {
    q: 'How does an automated AI business scan work?',
    a: 'An automated AI business scan analyzes your business across multiple public data points — your website performance, SEO signals, copy and conversion elements, and your social media presence — and produces a scored report in minutes. Velyr does exactly this: it pulls Core Web Vitals, scrapes your page structure, benchmarks your social engagement against industry averages, and uses Claude AI to write a plain-English explanation of what is working and what is dragging growth. Everything runs in parallel, so you get a complete picture without filling out a single questionnaire. No consultant, no scheduling, no kickoff call.'
  },
  {
    q: 'What is an AI Growth Agent and how does it help my business grow?',
    a: 'An AI Growth Agent is a semi-autonomous system that continuously analyzes your business data, prioritizes the single highest-impact change each week, and ships the fix on your behalf. Velyr\'s Growth Agent reads your live analytics every Monday, identifies your worst-performing area (bounce rate, low-converting page, weak headline, missing CTA), writes the code change, opens a GitHub Pull Request, and sends it to you on Telegram for one-tap approval. After deployment, it monitors impact for 48 hours and automatically rolls back if metrics drop. It is the difference between hiring a growth consultant once and having a tireless one working every week.'
  },
  {
    q: 'How much does AI-powered business analysis cost compared to hiring a consultant?',
    a: 'A traditional growth or marketing consultant typically charges €1,500–€8,000 per month, plus several weeks of onboarding before any output. AI-powered business analysis tools like Velyr start at €29 per month for a fully autonomous Growth Agent that ships improvements weekly — roughly 50–250x cheaper than a human consultant. For one-off analysis, Velyr offers a free instant audit and a €9 full report, so you can validate the depth of insight before committing to a subscription. Most SMEs recover the monthly cost from a single improved conversion.'
  },
  {
    q: 'What growth opportunities can an AI business audit tool identify?',
    a: 'A modern AI business audit tool surfaces opportunities across performance, positioning, and conversion. Velyr identifies slow-loading pages that hurt mobile bounce rates, missing or weak calls-to-action, headlines that focus on features instead of customer outcomes, absent social proof, hidden pricing, broken SEO basics (titles, meta descriptions, H1, alt text), and underperforming social channels benchmarked against your detected industry. It also spots gaps versus competitors when you connect competitor URLs. Each finding comes with a specific recommendation, not a vague best-practice tip.'
  },
  {
    q: 'Can I automatically scan my business for weaknesses and blind spots?',
    a: 'Yes — automated scanning is exactly what Velyr is built for. Drop in your website URL and any social handles, and within 15–25 seconds you get a composite 0–100 score broken down across performance, SEO, copy/UX, and social engagement. The scan flags blind spots most owners never see: pages slower than 70% of mobile sites, headlines that fail to address customer outcomes, missing trust signals, or social engagement well below your industry benchmark. You do not need to install anything or grant any access for the basic scan.'
  },
  {
    q: 'What is the difference between a business scan and a traditional business audit?',
    a: 'A traditional business audit is a multi-week engagement where a consultant interviews stakeholders, reviews documents, and delivers a slide deck. A business scan, by contrast, is automated, data-driven, and finished in minutes — it analyzes the live signals your customers actually see (your site, your socials, your conversion path) rather than producing a strategic narrative. Velyr replaces the discovery phase of a traditional audit with an instant, evidence-based scorecard, and the implementation phase with an AI Growth Agent that ships fixes weekly. The result is faster, cheaper, and continuously refreshed instead of going stale after the final report.'
  },
  {
    q: 'How do I use AI for my SME growth strategy?',
    a: 'The most effective way to use AI for SME growth is to let it handle the work humans are slow at: continuous monitoring, benchmark comparison, and writing the actual fix. Start by running a free AI audit — Velyr scores your site and socials in under 30 seconds — so you have a baseline. Then plug in an AI Growth Agent that watches your analytics weekly, proposes the single highest-leverage change, and waits for your approval before deploying. Keep your role at the strategic level (saying yes or no) while AI handles diagnosis, prioritization, and implementation.'
  },
  {
    q: 'Why use an AI growth agent instead of a traditional business consultant?',
    a: 'An AI growth agent operates 24/7 at a fraction of the cost, ships actual code changes rather than recommendations, and learns from every deployment. A traditional consultant produces a strategy document; Velyr\'s Growth Agent reads your real analytics, writes the fix, opens a Pull Request, deploys after your approval, and rolls back automatically if the change hurts your bounce rate. There is no kickoff call, no retainer, no Slack channel — just a Telegram message every Monday with the next move. For founders and SME operators who value speed and measurable outcomes, this is a structurally better trade-off.'
  },
  {
    q: 'What does a fully automated business intelligence tool do for small businesses?',
    a: 'A fully automated business intelligence tool turns the data small businesses already generate — analytics, social engagement, conversion behavior — into a prioritized action list without anyone having to build dashboards or run reports. Velyr does this end-to-end: it scans your business, scores it, identifies your weakest link against industry benchmarks, and (on the Growth Agent plan) ships the fix. For a small team without a dedicated analyst, this is the difference between guessing where to invest time and knowing. Weekly summaries delivered to Telegram keep you informed without logging into another dashboard.'
  },
  {
    q: "How quickly can an AI tool give me a complete picture of my company's strengths and weaknesses?",
    a: 'A modern AI audit tool can produce a complete strengths-and-weaknesses snapshot in under a minute. Velyr typically returns a free scan in 15–25 seconds, including performance, SEO, copy/UX, social benchmarks, and an AI-written explanation of what to fix first. The premium full audit takes 30–60 seconds and adds deeper social diagnostics, hook analysis, and brand clarity scoring. Compared to a traditional consulting engagement that takes 2–6 weeks to deliver a comparable diagnostic, that is roughly 10,000x faster.'
  },
]

function Logo({ size = 24, color = '#2a5c45' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke={color} strokeWidth="1.1" opacity="0.35" />
      <circle cx="16" cy="16" r="9"  stroke={color} strokeWidth="1.1" opacity="0.6" />
      <circle cx="16" cy="16" r="3.2" fill={color} />
      <line x1="16" y1="2"  x2="16" y2="7"  stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="16" y1="25" x2="16" y2="30" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="2"  y1="16" x2="7"  y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <line x1="25" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}

export default function Faq({ navigate }) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'FAQ — Velyr AI Business Audit'

    const setOrCreateMeta = (name, content) => {
      let tag = document.querySelector(`meta[name="${name}"]`)
      const created = !tag
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute('name', name)
        document.head.appendChild(tag)
      }
      const prev = tag.getAttribute('content')
      tag.setAttribute('content', content)
      return { tag, prev, created }
    }

    const robots = setOrCreateMeta('robots', 'index, follow')

    const pageUrl = 'https://www.velyr.io' + window.location.pathname

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical) }
    canonical.setAttribute('href', pageUrl)

    let hreflangEn = document.querySelector('link[rel="alternate"][hreflang="en"]')
    if (!hreflangEn) { hreflangEn = document.createElement('link'); hreflangEn.setAttribute('rel', 'alternate'); hreflangEn.setAttribute('hreflang', 'en'); document.head.appendChild(hreflangEn) }
    hreflangEn.setAttribute('href', pageUrl)

    let hreflangDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]')
    if (!hreflangDefault) { hreflangDefault = document.createElement('link'); hreflangDefault.setAttribute('rel', 'alternate'); hreflangDefault.setAttribute('hreflang', 'x-default'); document.head.appendChild(hreflangDefault) }
    hreflangDefault.setAttribute('href', pageUrl)

    const ld = document.createElement('script')
    ld.type = 'application/ld+json'
    ld.id = 'faq-jsonld'
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    })
    document.head.appendChild(ld)

    return () => {
      document.title = prevTitle
      if (robots.created) robots.tag.remove()
      else robots.tag.setAttribute('content', robots.prev || 'index, follow')
      canonical.setAttribute('href', 'https://www.velyr.io/')
      hreflangEn.setAttribute('href', 'https://www.velyr.io/')
      hreflangDefault.setAttribute('href', 'https://www.velyr.io/')
      const existing = document.getElementById('faq-jsonld')
      if (existing) existing.remove()
    }
  }, [])

  return (
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef' }}>

        <nav style={{ borderBottom: '1px solid rgba(28,25,23,0.08)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={24} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: '#1c1917', letterSpacing: '-.01em' }}>Velyr</span>
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300, transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = '#6b6460'}
            onMouseLeave={e => e.target.style.color = '#a09890'}
          >← Back to home</button>
        </nav>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 96px' }}>
          <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2a5c45', marginBottom: 16, fontWeight: 400 }}>Help</p>
          <h1 style={{ marginBottom: 16 }}>Frequently Asked Questions</h1>
          <p style={{ marginBottom: 56, color: '#a09890', fontSize: 15 }}>Common questions about AI business audits, the Velyr Growth Agent, and how automated business intelligence compares to traditional consulting.</p>

          {FAQS.map((f, i) => (
            <div key={i} style={{ marginBottom: 40, paddingBottom: 40, borderBottom: i < FAQS.length - 1 ? '1px solid rgba(28,25,23,0.08)' : 'none' }}>
              <h2>{f.q}</h2>
              <p>{f.a}</p>
            </div>
          ))}

          <div style={{ marginTop: 56, padding: 24, background: '#ffffff', borderRadius: 14, border: '1px solid rgba(28,25,23,0.08)' }}>
            <h2 style={{ marginBottom: 8 }}>Still have questions?</h2>
            <p style={{ marginBottom: 12 }}>The fastest way to see what Velyr can do for your business is to run a free scan. No account required.</p>
            <p>
              <button onClick={() => navigate('/')} style={{ background: '#2a5c45', color: '#f7f4ef', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: 'Jost, sans-serif', fontWeight: 400, cursor: 'pointer', letterSpacing: '.02em' }}>Run a free scan</button>
              {' '}or email <a href="mailto:info@velyr.io">info@velyr.io</a>.
            </p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(28,25,23,0.08)', padding: '24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#a09890', fontWeight: 300 }}>© 2026 Velyr</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => navigate('/faq')}       style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>FAQ</button>
            <button onClick={() => navigate('/privacy')}   style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Privacy Policy</button>
            <button onClick={() => navigate('/impressum')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Impressum</button>
            <button onClick={() => navigate('/agb')}       style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>AGB</button>
          </div>
        </div>

      </div>
    </>
  )
}
