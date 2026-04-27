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
const label = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09890', fontWeight: 400, marginBottom: 8, display: 'block' }

export default function PrivacyPolicy({ navigate }) {
  return (
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef' }}>

        <nav style={{ borderBottom: '1px solid rgba(28,25,23,0.08)', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: '#1c1917', letterSpacing: '-.01em' }}>
            Scano
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300, transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = '#6b6460'}
            onMouseLeave={e => e.target.style.color = '#a09890'}
          >← Back to home</button>
        </nav>

        <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px 96px' }}>
          <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2a5c45', marginBottom: 16, fontWeight: 400 }}>Legal</p>
          <h1 style={{ marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ marginBottom: 48, color: '#a09890', fontSize: 13 }}>Last updated: April 2026</p>

          <div style={block}>
            <h2>Who we are</h2>
            <p>Scano is operated by Florian Rappold, Maikäferstraße 3f, 85551 Kirchheim bei München, Germany. If you have any questions about this privacy policy, you can contact us at <a href="mailto:info@scano.io">info@scano.io</a>.</p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(28,25,23,0.09)', margin: '8px 0 36px' }} />

          <div style={block}>
            <h2>What data we collect</h2>
            <p style={{ marginBottom: 12 }}>When you use Scano, we collect the following information:</p>
            <ul>
              <li><strong style={{ fontWeight: 500 }}>Website URL and social handles</strong> you enter into the scan form. These are used solely to perform the audit.</li>
              <li><strong style={{ fontWeight: 500 }}>Your email address</strong>, if you choose to create an account or purchase the full report. This is used to send you your report and for account management.</li>
              <li><strong style={{ fontWeight: 500 }}>Technical data</strong> such as your IP address and browser type, which are collected automatically by our hosting provider (Vercel) for security and performance purposes.</li>
            </ul>
          </div>

          <div style={block}>
            <h2>What data we do NOT collect</h2>
            <ul>
              <li>We do not use tracking cookies or advertising cookies.</li>
              <li>We do not use Google Analytics or any other behavioral tracking service.</li>
              <li>We do not share or sell your data to third parties.</li>
            </ul>
          </div>

          <div style={block}>
            <h2>How we use your data</h2>
            <ul>
              <li>To run your business audit and generate your report.</li>
              <li>To send you your report by email, if you purchased the full version.</li>
              <li>To communicate with you about your account, if you have one.</li>
            </ul>
            <p style={{ marginTop: 12 }}>The legal basis for processing is your consent (Art. 6(1)(a) GDPR) and the performance of a contract (Art. 6(1)(b) GDPR).</p>
          </div>

          <div style={block}>
            <h2>Third-party services</h2>
            <p style={{ marginBottom: 12 }}>Scano uses the following third-party services to operate:</p>
            <ul>
              <li><strong style={{ fontWeight: 500 }}>Vercel</strong> — hosting and content delivery. Privacy policy: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">vercel.com/legal/privacy-policy</a></li>
              <li><strong style={{ fontWeight: 500 }}>Supabase</strong> — secure database storage for reports and accounts. Privacy policy: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a></li>
              <li><strong style={{ fontWeight: 500 }}>SociaVault</strong> — used to retrieve publicly available social media data (post counts, engagement rates, captions) to power the audit. Only public data is accessed.</li>
            </ul>
            <p style={{ marginTop: 12 }}>All services are GDPR-compliant. No data is stored outside the European Economic Area or on servers with inadequate protection.</p>
          </div>

          <div style={block}>
            <h2>Cookies</h2>
            <p>Scano does not use marketing or tracking cookies. We may use a single session cookie for login purposes if you create an account. This cookie is strictly necessary for the service to function and does not require your consent under GDPR.</p>
          </div>

          <div style={block}>
            <h2>How long we keep your data</h2>
            <p>We store your scan data and report for as long as your account is active, or for 12 months after your last use if you have no account. You can request deletion at any time.</p>
          </div>

          <div style={block}>
            <h2>Your rights</h2>
            <p style={{ marginBottom: 12 }}>Under the GDPR, you have the following rights:</p>
            <ul>
              <li>The right to access the personal data we hold about you.</li>
              <li>The right to have your data corrected if it is inaccurate.</li>
              <li>The right to have your data deleted ("right to be forgotten").</li>
              <li>The right to restrict or object to processing.</li>
              <li>The right to data portability.</li>
              <li>The right to withdraw consent at any time.</li>
            </ul>
            <p style={{ marginTop: 12 }}>To exercise any of these rights, contact us at <a href="mailto:info@scano.io">info@scano.io</a>. We will respond within 30 days.</p>
          </div>

          <div style={block}>
            <h2>Right to complain</h2>
            <p>You have the right to lodge a complaint with the competent data protection authority. In Bavaria, this is the Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), Promenade 27, 91522 Ansbach.</p>
          </div>

          <div style={block}>
            <h2>Changes to this policy</h2>
            <p>If we make significant changes to this privacy policy, we will update the date at the top of this page. We recommend checking back periodically.</p>
          </div>

        </div>

        <div style={{ borderTop: '1px solid rgba(28,25,23,0.08)', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
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