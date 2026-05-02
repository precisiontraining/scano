const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  h1 { font-family: 'Cormorant Garant', serif; font-weight: 300; font-size: clamp(36px, 5vw, 56px); letter-spacing: -.025em; line-height: 1.08; }
  h2 { font-family: 'Cormorant Garant', serif; font-weight: 400; font-size: 22px; letter-spacing: -.015em; margin-bottom: 10px; }
  p, li { color: #6b6460; line-height: 1.78; font-size: 15px; font-weight: 300; }
  a { color: #2a5c45; text-decoration: underline; text-decoration-color: rgba(42,92,69,0.35); transition: color .2s; }
  a:hover { color: #1e4433; }
  ul { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
`

const block = { marginBottom: 36 }

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

export default function PrivacyPolicy({ navigate }) {
  return (
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef' }}>

        <nav style={{ borderBottom: '1px solid rgba(28,25,23,0.08)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size={24} />
            <span style={{ fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: '#1c1917', letterSpacing: '-.01em' }}>Scano</span>
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300, transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = '#6b6460'}
            onMouseLeave={e => e.target.style.color = '#a09890'}
          >← Back to home</button>
        </nav>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px 96px' }}>
          <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2a5c45', marginBottom: 16, fontWeight: 400 }}>Legal</p>
          <h1 style={{ marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ marginBottom: 48, color: '#a09890', fontSize: 13 }}>Last updated: May 2026</p>

          <div style={block}>
            <h2>Who we are</h2>
            <p>Scano is operated by Florian Rappold, Maikäferstraße 3f, 85551 Kirchheim bei München, Germany. If you have any questions about this privacy policy, you can contact us at <a href="mailto:simplefitplans017@gmail.com">scan.info</a>.</p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(28,25,23,0.09)', margin: '8px 0 36px' }} />

          <div style={block}>
            <h2>What data we collect</h2>
            <p style={{ marginBottom: 12 }}>When you use Scano, we may collect the following information:</p>
            <ul>
              <li><strong style={{ fontWeight: 500 }}>Website URL and social media handles</strong> you enter into the scan form. These are used solely to perform the audit and are not stored beyond what is necessary to generate and display your report.</li>
              <li><strong style={{ fontWeight: 500 }}>Your email address</strong>, if you choose to have your report sent to you by email. This is used only to deliver your report link and is stored in our database linked to your scan.</li>
              <li><strong style={{ fontWeight: 500 }}>Your email address</strong>, if you sign up for the waitlist for the full report feature. This is used only to notify you when the feature becomes available. You can request removal at any time.</li>
              <li><strong style={{ fontWeight: 500 }}>Publicly available social media data</strong> such as follower counts, post captions, and engagement statistics. We only access data that is publicly visible on each platform — we never access private accounts or require login credentials.</li>
              <li><strong style={{ fontWeight: 500 }}>Technical data</strong> such as IP address and browser type, collected automatically by our hosting provider (Vercel) for security and performance purposes.</li>
            </ul>
          </div>

          <div style={block}>
            <h2>What data we do NOT collect</h2>
            <ul>
              <li>We do not use marketing or tracking cookies.</li>
              <li>We do not use Google Analytics or any behavioral tracking service.</li>
              <li>We do not share or sell your data to any third party.</li>
              <li>We do not access private social media accounts or require any social media login.</li>
              <li>We do not store payment data — no payment processing is currently active on this platform.</li>
            </ul>
          </div>

          <div style={block}>
            <h2>How we use your data</h2>
            <ul>
              <li>To run your business audit and generate your report.</li>
              <li>To send you your report link by email, if you requested this.</li>
              <li>To notify you when new features (such as the full paid report) become available, if you signed up for the waitlist.</li>
            </ul>
            <p style={{ marginTop: 12 }}>The legal basis for processing is your consent (Art. 6(1)(a) GDPR) where you have actively provided your email, and our legitimate interest (Art. 6(1)(f) GDPR) for technical data collected by our hosting infrastructure.</p>
          </div>

          <div style={block}>
            <h2>Third-party services</h2>
            <p style={{ marginBottom: 12 }}>Scano uses the following third-party services to operate:</p>
            <ul>
              <li><strong style={{ fontWeight: 500 }}>Vercel</strong> — hosting and content delivery (USA, with EU adequacy). Privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a></li>
              <li><strong style={{ fontWeight: 500 }}>Supabase</strong> — secure database storage for scan results and email addresses. Privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></li>
              <li><strong style={{ fontWeight: 500 }}>Apify</strong> — used to retrieve publicly available social media data (follower counts, post captions, engagement statistics) to power the audit. Only public data is accessed. Privacy policy: <a href="https://apify.com/privacy-policy" target="_blank" rel="noopener noreferrer">apify.com/privacy-policy</a></li>
              <li><strong style={{ fontWeight: 500 }}>Mailjet</strong> — used to send transactional emails (your report link). Your email address is transmitted to Mailjet solely for this purpose. Privacy policy: <a href="https://www.mailjet.com/legal/privacy-policy/" target="_blank" rel="noopener noreferrer">mailjet.com/legal/privacy-policy</a></li>
              <li><strong style={{ fontWeight: 500 }}>Google PageSpeed Insights API</strong> — used to measure your website's loading performance. Your website URL is sent to Google's API for this purpose. Privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></li>
              <li><strong style={{ fontWeight: 500 }}>OpenRouter / Anthropic</strong> — used to generate the AI-written analysis in your report. Scan data (website metrics and social statistics) is sent to this service. No personal data beyond what you enter is included. Privacy policy: <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">openrouter.ai/privacy</a></li>
            </ul>
          </div>

          <div style={block}>
            <h2>Cookies</h2>
            <p>Scano does not use marketing or tracking cookies. No cookie consent banner is required as we only use strictly necessary technical cookies (e.g. session management) where applicable. These do not require consent under GDPR.</p>
          </div>

          <div style={block}>
            <h2>How long we keep your data</h2>
            <ul>
              <li><strong style={{ fontWeight: 500 }}>Scan reports</strong> are stored for up to 12 months after creation, then automatically deleted.</li>
              <li><strong style={{ fontWeight: 500 }}>Email addresses</strong> linked to a report are stored for the same duration as the report.</li>
              <li><strong style={{ fontWeight: 500 }}>Waitlist emails</strong> are stored until the feature launches or until you request removal — whichever comes first.</li>
            </ul>
            <p style={{ marginTop: 12 }}>You can request deletion of your data at any time by contacting us.</p>
          </div>

          <div style={block}>
            <h2>Your rights (GDPR)</h2>
            <p style={{ marginBottom: 12 }}>Under the General Data Protection Regulation, you have the following rights:</p>
            <ul>
              <li>The right to access the personal data we hold about you.</li>
              <li>The right to have inaccurate data corrected.</li>
              <li>The right to have your data deleted ("right to be forgotten").</li>
              <li>The right to restrict or object to processing.</li>
              <li>The right to data portability.</li>
              <li>The right to withdraw consent at any time, without affecting the lawfulness of processing before withdrawal.</li>
            </ul>
            <p style={{ marginTop: 12 }}>To exercise any of these rights, contact us at <a href="mailto:simplefitplans017@gmail.com">scan.info</a>. We will respond within 30 days.</p>
          </div>

          <div style={block}>
            <h2>Right to complain</h2>
            <p>You have the right to lodge a complaint with the competent supervisory authority. In Bavaria, this is the Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach, Germany. Website: <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">lda.bayern.de</a></p>
          </div>

          <div style={block}>
            <h2>Changes to this policy</h2>
            <p>We will update the date at the top of this page when significant changes are made. We recommend checking back periodically if you use Scano regularly.</p>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(28,25,23,0.08)', padding: '24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#a09890', fontWeight: 300 }}>© 2026 Scano</span>
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Privacy Policy</button>
            <button onClick={() => navigate('/impressum')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>Impressum</button>
          </div>
        </div>

      </div>
    </>
  )
}