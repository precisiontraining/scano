const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garant:wght@300;400;500&family=Jost:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f4ef; color: #1c1917; font-family: 'Jost', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; }
  h1 { font-family: 'Cormorant Garant', serif; font-weight: 300; font-size: clamp(36px, 5vw, 56px); letter-spacing: -.025em; line-height: 1.08; }
  h2 { font-family: 'Cormorant Garant', serif; font-weight: 400; font-size: 22px; letter-spacing: -.015em; margin-bottom: 10px; }
  p, li { color: #6b6460; line-height: 1.78; font-size: 15px; font-weight: 300; }
  a { color: #2a5c45; text-decoration: underline; text-decoration-color: rgba(42,92,69,0.35); transition: color .2s; }
  a:hover { color: #1e4433; }
`

function LegalLayout({ children, title, navigate }) {
  return (
    <>
      <style>{SHARED_CSS}</style>
      <div style={{ minHeight: '100vh', background: '#f7f4ef' }}>
        {/* Nav */}
        <nav style={{ borderBottom: '1px solid rgba(28,25,23,0.08)', padding: '0 40px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(247,244,239,0.95)' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Cormorant Garant, serif', fontWeight: 500, fontSize: 20, color: '#1c1917', letterSpacing: '-.01em' }}>
            Scano
          </button>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#a09890', fontFamily: 'Jost, sans-serif', fontWeight: 300, transition: 'color .2s' }}
            onMouseEnter={e => e.target.style.color = '#6b6460'}
            onMouseLeave={e => e.target.style.color = '#a09890'}
          >← Back to home</button>
        </nav>

        {/* Content */}
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '72px 24px 96px' }}>
          <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#2a5c45', marginBottom: 16, fontWeight: 400 }}>Legal</p>
          <h1 style={{ marginBottom: 48 }}>{title}</h1>
          {children}
        </div>

        {/* Footer */}
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

const block = { marginBottom: 36 }
const label = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09890', fontWeight: 400, marginBottom: 8, display: 'block' }

export default function Impressum({ navigate }) {
  return (
    <LegalLayout title="Impressum" navigate={navigate}>

      <div style={block}>
        <span style={label}>Angaben gemäß § 5 TMG</span>
        <p>Florian Rappold<br />Maikäferstraße 3f<br />85551 Kirchheim bei München<br />Deutschland</p>
      </div>

      <div style={block}>
        <span style={label}>Kontakt</span>
        <p>E-Mail: <a href="mailto:info@scano.io">info@scano.io</a></p>
      </div>

      <div style={block}>
        <span style={label}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</span>
        <p>Florian Rappold<br />Maikäferstraße 3f<br />85551 Kirchheim bei München</p>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(28,25,23,0.09)', margin: '40px 0' }} />

      <h2 style={{ marginBottom: 12 }}>Haftungsausschluss</h2>

      <div style={block}>
        <span style={label}>Haftung für Inhalte</span>
        <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      </div>

      <div style={block}>
        <span style={label}>Haftung für Links</span>
        <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
      </div>

      <div style={block}>
        <span style={label}>Urheberrecht</span>
        <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
      </div>

    </LegalLayout>
  )
}