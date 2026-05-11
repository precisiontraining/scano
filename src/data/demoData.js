// Hardcoded demo dataset for the agent dashboard.
// Activated via /agent?demo=true — used for product video recordings.
// Shape mirrors the Supabase rows the dashboard fetches (agent_runs,
// agent_subscriptions, agent_funnel_pages, agent_learnings, impact_metrics).

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Anchor at the most recent Monday relative to "now". This keeps "This week",
// "Last week" labels accurate whenever the video is recorded.
function lastMonday(now = new Date()) {
  const d = new Date(now)
  d.setHours(9, 12, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon …
  const back = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - back)
  return d
}

const ANCHOR = lastMonday()

function isoWeeksAgo(n, hourOffset = 0, minuteOffset = 0) {
  const d = new Date(ANCHOR.getTime() - n * WEEK_MS)
  d.setHours(9 + hourOffset, 12 + minuteOffset, 0, 0)
  return d.toISOString()
}

// ── Subscription ──────────────────────────────────────────────────────────────
export const demoSubscription = {
  id: 'demo-subscription',
  auth_user_id: 'demo-user',
  status: 'active',
  plan: 'Growth',
  site_url: 'https://acme-store.com',
  github_repo: 'acme/storefront',
  is_public: true,
  public_slug: 'acme-store',
  telegram_chat_id: '1234567',
  competitors: ['https://competitor-a.com', 'https://competitor-b.com'],
  created_at: isoWeeksAgo(10),
}

// ── Runs ──────────────────────────────────────────────────────────────────────
// 10 weekly runs. 7 deployed (merged), 2 rejected (skipped by user),
// 1 rolled_back (auto-rollback after bounce-rate regression).
// week 0 = most recent Monday … week 9 = oldest.
const RUN_TEMPLATES = [
  {
    weeks: 0,
    status: 'deployed',
    pr_number: 247,
    problem: 'Mobile add-to-cart button hidden below the fold on PDPs',
    data_insight: 'Mobile users on product pages scrolled an avg of 38% of the page before bouncing — 71% never saw the add-to-cart CTA.',
    impact: 'Lost ~120 mobile conversions/week to invisible CTA.',
    solution: 'Added a sticky bottom-bar add-to-cart on mobile breakpoints with quantity selector.',
    expected_improvement: '+0.4pp CVR',
    file_to_edit: 'src/components/ProductDetail/AddToCart.tsx',
    confidence_score: 91,
    bounce_before: 43, bounce_after: 41,
    metric_label: 'Bounce −2pp',
  },
  {
    weeks: 1,
    status: 'deployed',
    pr_number: 241,
    problem: 'Checkout form asks for 11 fields — industry average is 6',
    data_insight: 'PostHog session replays showed 34% drop-off on the shipping step, with users abandoning specifically at "company name" and "address line 2".',
    impact: 'Estimated €4.2k/mo lost revenue on the shipping step.',
    solution: 'Removed 4 non-essential fields, marked address line 2 optional, auto-collapsed company field for non-B2B.',
    expected_improvement: '+0.3pp CVR',
    file_to_edit: 'src/components/Checkout/ShippingForm.tsx',
    confidence_score: 87,
    bounce_before: 45, bounce_after: 42,
    metric_label: 'Bounce −3pp',
  },
  {
    weeks: 2,
    status: 'rejected',
    pr_number: 235,
    problem: 'Pricing page lacks clear plan comparison',
    data_insight: 'Users on /pricing spent 22s on average vs 1m12s on competitor pricing pages with comparison tables.',
    impact: 'Likely contributing to 68% pricing-page bounce.',
    solution: 'Added a 3-column comparison table with feature checkmarks and "most popular" highlight.',
    expected_improvement: '+0.2pp CVR',
    file_to_edit: 'src/pages/Pricing.tsx',
    confidence_score: 72,
    skip_reason: 'Wanted to stay with simple card layout — testing copy first.',
  },
  {
    weeks: 3,
    status: 'deployed',
    pr_number: 228,
    problem: 'Hero LCP image 1.4MB, loaded synchronously — LCP 3.8s',
    data_insight: 'Lighthouse + real-user metrics show LCP element is the hero image. Mobile users on 4G see 3.8s LCP, well past the 2.5s "good" threshold.',
    impact: 'Every 100ms of LCP costs ~1% in conversion. Estimated 5% conversion loss.',
    solution: 'Compressed hero to AVIF (218KB), added preload hint, switched srcset to deliver retina only on retina screens.',
    expected_improvement: 'LCP 3.8s → 2.1s',
    file_to_edit: 'src/components/Hero/HeroImage.tsx',
    confidence_score: 96,
    bounce_before: 49, bounce_after: 45,
    metric_label: 'Bounce −4pp',
  },
  {
    weeks: 4,
    status: 'deployed',
    pr_number: 219,
    problem: 'No social proof above the fold on landing page',
    data_insight: 'Heatmaps show users scroll past the hero looking for trust signals — 41% scroll to the reviews section before any CTA interaction.',
    impact: 'Cold visitors lack a reason to trust the brand on first impression.',
    solution: 'Added a thin social-proof strip below the hero: "Trusted by 12,400+ customers · ★ 4.8 on Trustpilot · Featured in TechCrunch".',
    expected_improvement: '+0.25pp CVR',
    file_to_edit: 'src/components/Hero/SocialProof.tsx',
    confidence_score: 84,
    bounce_before: 52, bounce_after: 49,
    metric_label: 'Bounce −3pp',
  },
  {
    weeks: 5,
    status: 'rolled_back',
    pr_number: 211,
    problem: 'Hero CTA copy is generic ("Get Started")',
    data_insight: 'CTA click-through on hero was 2.1% — industry benchmark is 3.4% for outcome-focused copy.',
    impact: 'Roughly 1.3pp CTR delta translates to ~80 lost weekly sessions.',
    solution: 'Changed "Get Started" to "Shop the Spring Drop →" with arrow-on-hover.',
    expected_improvement: '+0.3pp CVR',
    file_to_edit: 'src/components/Hero/Hero.tsx',
    confidence_score: 78,
    bounce_before: 54, bounce_after: 58,
    metric_label: 'Bounce +4pp · auto-rolled-back',
    rollback_note: 'Bounce rate rose 4pp 48h after deploy — auto-rolled-back per guardrail.',
  },
  {
    weeks: 6,
    status: 'deployed',
    pr_number: 203,
    problem: 'Mobile spacing too tight on product grid (4px gaps)',
    data_insight: 'Mobile users mis-tap adjacent products 8% of the time per session replays — they then bounce back, losing context.',
    impact: 'Friction in the primary discovery surface.',
    solution: 'Bumped grid gap from 4px → 12px on <768px, increased tap target padding to 44px (Apple HIG).',
    expected_improvement: '+0.15pp CVR',
    file_to_edit: 'src/components/ProductGrid/ProductGrid.module.css',
    confidence_score: 82,
    bounce_before: 55, bounce_after: 53,
    metric_label: 'Bounce −2pp',
  },
  {
    weeks: 7,
    status: 'deployed',
    pr_number: 196,
    problem: 'Product images not lazy-loaded — 2.4MB initial payload',
    data_insight: 'Network panel shows 18 product thumbnails loaded eagerly on /shop, blocking TTI by ~900ms on mobile.',
    impact: 'Slow time-to-interactive correlates with the highest bounce segment.',
    solution: 'Added loading="lazy" + native intersection observer fallback. Reduced initial payload by 1.9MB.',
    expected_improvement: 'LCP −0.6s',
    file_to_edit: 'src/components/ProductGrid/ProductCard.tsx',
    confidence_score: 94,
    bounce_before: 56, bounce_after: 55,
    metric_label: 'Bounce −1pp',
  },
  {
    weeks: 8,
    status: 'rejected',
    pr_number: 188,
    problem: 'Footer newsletter signup has no incentive',
    data_insight: 'Newsletter conversion is 0.4% — industry median with incentives is 3.1%.',
    impact: 'Email list growth has stagnated for 6 weeks.',
    solution: 'Added "10% off your first order" headline and a single email field.',
    expected_improvement: '+€800/mo email revenue',
    file_to_edit: 'src/components/Footer/NewsletterSignup.tsx',
    confidence_score: 69,
    skip_reason: 'Brand wants to avoid discount conditioning — testing free shipping instead.',
  },
  {
    weeks: 9,
    status: 'deployed',
    pr_number: 179,
    problem: 'Trust badges buried in footer — checkout has no payment-method icons',
    data_insight: 'Checkout abandonment hits 41% at the payment step. Competitor sites show Visa/Mastercard/PayPal/Klarna icons above the form.',
    impact: 'Trust friction at the moment of payment commitment.',
    solution: 'Added an inline row of payment-method SVGs above the "Pay now" button on /checkout.',
    expected_improvement: '+0.4pp CVR',
    file_to_edit: 'src/components/Checkout/PaymentMethodBadges.tsx',
    confidence_score: 89,
    bounce_before: 59, bounce_after: 56,
    metric_label: 'Bounce −3pp',
  },
]

export const demoRuns = RUN_TEMPLATES.map((t, idx) => {
  const created = isoWeeksAgo(t.weeks)
  const completed = isoWeeksAgo(t.weeks, 0, 18)
  const hasBounce = t.bounce_before != null && t.bounce_after != null
  return {
    id: `demo-run-${idx + 1}`,
    subscription_id: 'demo-subscription',
    status: t.status,
    pr_number: t.pr_number,
    pr_url: `https://github.com/acme/storefront/pull/${t.pr_number}`,
    current_step: 'sending_notification',
    created_at: created,
    completed_at: completed,
    bounce_rate_before: hasBounce ? t.bounce_before : null,
    bounce_rate_after: hasBounce ? t.bounce_after : null,
    ab_test_variants: null,
    competitor_changes: null,
    analysis_result: {
      problem: t.problem,
      data_insight: t.data_insight,
      impact: t.impact,
      solution: t.solution,
      expected_improvement: t.expected_improvement,
      file_to_edit: t.file_to_edit,
      confidence_score: t.confidence_score,
      competitor_insight: null,
    },
    funnel_analysis: null,
    skip_reason: t.skip_reason || null,
    rollback_note: t.rollback_note || null,
  }
})

// ── Funnel pages ──────────────────────────────────────────────────────────────
export const demoFunnelPages = [
  { id: 'fp-1', subscription_id: 'demo-subscription', page_path: '/checkout/payment', page_type: 'checkout', drop_off_score: 67, views_7d: 1840, ai_insight: 'Highest exit point on the site. Payment-method trust signals were added last week — monitoring next 7 days.', created_at: isoWeeksAgo(0) },
  { id: 'fp-2', subscription_id: 'demo-subscription', page_path: '/pricing', page_type: 'pricing', drop_off_score: 58, views_7d: 2410, ai_insight: 'Users skim the page in <25s. Plan comparison table would likely help — proposed PR was rejected.', created_at: isoWeeksAgo(0) },
  { id: 'fp-3', subscription_id: 'demo-subscription', page_path: '/products/spring-jacket', page_type: 'landing', drop_off_score: 44, views_7d: 3290, ai_insight: 'Mobile bounce dominates here. Sticky add-to-cart shipped this week — improvement expected.', created_at: isoWeeksAgo(0) },
  { id: 'fp-4', subscription_id: 'demo-subscription', page_path: '/shop', page_type: 'landing', drop_off_score: 31, views_7d: 5120, ai_insight: 'Improved by 11pp after lazy-loading product images two months ago.', created_at: isoWeeksAgo(0) },
  { id: 'fp-5', subscription_id: 'demo-subscription', page_path: '/', page_type: 'landing', drop_off_score: 24, views_7d: 8740, ai_insight: 'Strong page. Hero LCP fix moved this from 41% → 24% drop-off over 6 weeks.', created_at: isoWeeksAgo(0) },
  { id: 'fp-6', subscription_id: 'demo-subscription', page_path: '/about', page_type: 'about', drop_off_score: 19, views_7d: 740, ai_insight: 'Low-traffic page, healthy retention. No action recommended.', created_at: isoWeeksAgo(0) },
  { id: 'fp-7', subscription_id: 'demo-subscription', page_path: '/blog/sustainability', page_type: 'blog', drop_off_score: 12, views_7d: 510, ai_insight: 'High-quality referral source for first-time visitors.', created_at: isoWeeksAgo(0) },
]

// ── Learnings (Business DNA strip) ────────────────────────────────────────────
export const demoLearnings = [
  { id: 'l-1', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Sticky mobile add-to-cart lifted PDP conversion measurably.', change_type: 'mobile_ux',     delta: 0.4,  metric_type: 'CVR',    confidence: 'high',   created_at: isoWeeksAgo(0) },
  { id: 'l-2', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Shorter checkout forms reduce abandonment on shipping step.',         change_type: 'form_length',   delta: 0.3,  metric_type: 'CVR',    confidence: 'high',   created_at: isoWeeksAgo(1) },
  { id: 'l-3', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Compressing the hero image cuts bounce on mobile.',                  change_type: 'performance',   delta: 4,    metric_type: 'bounce', confidence: 'high',   created_at: isoWeeksAgo(3) },
  { id: 'l-4', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Above-the-fold social proof reduces first-visit bounce.',            change_type: 'social_proof',  delta: 3,    metric_type: 'bounce', confidence: 'medium', created_at: isoWeeksAgo(4) },
  { id: 'l-5', subscription_id: 'demo-subscription', outcome: 'negative', summary: 'Aggressive seasonal CTA copy ("Shop the Spring Drop") hurt bounce.', change_type: 'cta_copy',      delta: 4,    metric_type: 'bounce', confidence: 'high',   created_at: isoWeeksAgo(5) },
  { id: 'l-6', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Larger tap targets on mobile product grid reduce mis-taps.',         change_type: 'mobile_ux',     delta: 2,    metric_type: 'bounce', confidence: 'medium', created_at: isoWeeksAgo(6) },
  { id: 'l-7', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Lazy-loading product thumbnails improves time-to-interactive.',      change_type: 'performance',   delta: 1,    metric_type: 'bounce', confidence: 'high',   created_at: isoWeeksAgo(7) },
  { id: 'l-8', subscription_id: 'demo-subscription', outcome: 'positive', summary: 'Inline payment-method icons reduce checkout-step abandonment.',      change_type: 'trust_signals', delta: 3,    metric_type: 'bounce', confidence: 'high',   created_at: isoWeeksAgo(9) },
]

// ── Impact metrics (Before / After in InsightsPage + KPI bar) ────────────────
// One row per deployed run that has bounce_before / bounce_after defined.
export const demoImpactMetrics = demoRuns
  .filter(r => r.status === 'deployed' && r.bounce_rate_before != null)
  .map((r, i) => ({
    id: `im-${i + 1}`,
    subscription_id: 'demo-subscription',
    run_id: r.id,
    metric_type: 'bounce_rate',
    value_before: r.bounce_rate_before,
    value_after: r.bounce_rate_after,
    measured_at: r.completed_at,
  }))

// ── Headline metrics (10-week trend, for any future component that needs them) ─
export const demoHeadlineMetrics = {
  business_name: 'acme-store.com',
  scan_score_before: 52,
  scan_score_now: 74,
  conversion_rate_before: 2.4,
  conversion_rate_now: 3.8,
  bounce_rate_before: 59,
  bounce_rate_now: 41,
  lcp_before_seconds: 3.8,
  lcp_now_seconds: 2.1,
  runs_total: demoRuns.length,
  runs_merged: demoRuns.filter(r => r.status === 'deployed').length,
}

// ── Weekly timeseries (10 data points, oldest → newest) ──────────────────────
export const demoConversionTrend = [2.4, 2.5, 2.7, 2.6, 2.9, 3.1, 3.0, 3.3, 3.6, 3.8]
export const demoBounceTrend     = [59,  56,  55,  53,  58,  49,  45,  42,  43,  41]

// ── Bundled export for convenient consumption in AgentDashboard ──────────────
export const demoData = {
  subscription:  demoSubscription,
  runs:          demoRuns,
  funnelPages:   demoFunnelPages,
  learnings:     demoLearnings,
  impactMetrics: demoImpactMetrics,
  headline:      demoHeadlineMetrics,
  conversionTrend: demoConversionTrend,
  bounceTrend:     demoBounceTrend,
}

export default demoData
