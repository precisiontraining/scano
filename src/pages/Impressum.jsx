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

const block = { marginBottom: 36 }
const label = { fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#a09890', fontWeight: 400, marginBottom: 8, display: 'block' }

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

export default function Impressum({ navigate }) {
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
          <h1 style={{ marginBottom: 48 }}>Impressum</h1>

          <div style={block}>
            <span style={label}>Angaben gemäß § 5 TMG</span>
            <p>Florian Rappold<br />Maikäferstraße 3f<br />85551 Kirchheim bei München<br />Deutschland</p>
          </div>

          <div style={block}>
            <span style={label}>Kontakt</span>
            <p>E-Mail: <a href="mailto:simplefitplans017@gmail.com">scan.info</a></p>
          </div>

          <div style={block}>
            <span style={label}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</span>
            <p>Florian Rappold<br />Maikäferstraße 3f<br />85551 Kirchheim bei München</p>
          </div>

          <div style={block}>
            <span style={label}>Hinweis zur Dienstleistung</span>
            <p>Scano ist ein KI-gestütztes Analyse-Tool für Online-Auftritte. Die Ergebnisse basieren auf öffentlich zugänglichen Daten und automatisierten Analysen. Sie stellen keine rechtliche, steuerliche oder geschäftliche Beratung dar. Für Entscheidungen auf Basis der Berichte übernehmen wir keine Haftung.</p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(28,25,23,0.09)', margin: '8px 0 36px' }} />

          <h2 style={{ marginBottom: 20 }}>Haftungsausschluss</h2>

          <div style={block}>
            <span style={label}>Haftung für Inhalte</span>
            <p>Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.</p>
          </div>

          <div style={block}>
            <span style={label}>Haftung für Links</span>
            <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar.</p>
          </div>

          <div style={block}>
            <span style={label}>Urheberrecht</span>
            <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(28,25,23,0.09)', margin: '8px 0 36px' }} />

          <h2 style={{ marginBottom: 20 }}>Datenschutz</h2>

          <div style={block}>
            <span style={label}>Verantwortlicher</span>
            <p>Verantwortlicher im Sinne der DSGVO ist Florian Rappold, Maikäferstraße 3f, 85551 Kirchheim bei München. Kontakt: <a href="mailto:simplefitplans017@gmail.com">scan.info</a></p>
          </div>

          <div style={block}>
            <span style={label}>Soziale Medien — öffentliche Daten</span>
            <p>Scano greift ausschließlich auf öffentlich zugängliche Daten sozialer Netzwerke zu (z. B. Follower-Zahlen, öffentliche Beiträge). Es werden keine privaten Konten analysiert und keine Zugangsdaten gespeichert. Die Verarbeitung dieser Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</p>
          </div>

          <div style={block}>
            <span style={label}>Weitere Informationen</span>
            <p>Weitere Informationen zum Datenschutz finden Sie in unserer <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a5c45', fontFamily: 'Jost, sans-serif', fontSize: 15, fontWeight: 300, textDecoration: 'underline', textDecorationColor: 'rgba(42,92,69,0.35)', padding: 0 }}>Datenschutzerklärung</button>.</p>
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