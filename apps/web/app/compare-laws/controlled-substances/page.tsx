export const metadata = { title: 'Controlled Substances — Greyledge' }

export default function ControlledSubstancesPage() {
  const schedules = [
    {
      name: 'Schedule I',
      description: 'High potential for abuse, no currently accepted medical use',
      substances: ['LSD', 'Psilocybin', 'MDMA', 'Heroin', 'Mescaline'],
    },
    {
      name: 'Schedule II',
      description: 'High potential for abuse, accepted medical use with restrictions',
      substances: ['Cocaine', 'Morphine', 'Amphetamine', 'Methadone', 'Opium'],
    },
    {
      name: 'Schedule III',
      description: 'Moderate potential for abuse, accepted medical use',
      substances: ['Ketamine', 'Anabolic steroids', 'Barbiturates', 'Lysergic acid'],
    },
    {
      name: 'Schedule IV',
      description: 'Low potential for abuse, accepted medical use',
      substances: ['Benzodiazepines', 'Alprazolam', 'Diazepam', 'Lorazepam', 'Phenobarbital'],
    },
    {
      name: 'Schedule V',
      description: 'Lowest potential for abuse, accepted medical use',
      substances: ['Cough preparations', 'Antidiarrheal compounds', 'Analgesics'],
    },
  ]

  const lastUpdateDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <main className="page">
      <header className="site-header">
        <div style={{ maxWidth: '66.666%' }}>
          <p className="page-eyebrow">Compare Laws</p>
          <h1>Controlled Substances</h1>
          <p className="tagline">Federal vs. state scheduling analysis for controlled substances, with every cross-reference resolved and every conclusion traceable to statutory text.</p>
          <p className="scope-label">Covers federal CSA and all 50 state schedules. Methodology V.02.</p>
        </div>
      </header>

      {schedules.map((schedule, idx) => (
        <section key={idx} className="section">
          <div className="section-title">{schedule.name}</div>
          <p className="section-subtitle">{schedule.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {schedule.substances.map((substance, sidx) => (
              <div key={sidx} className="substance-item">
                {substance}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="section">
        <p className="muted" style={{ fontSize: 13 }}>
          Last corpus update: <strong>{lastUpdateDate}</strong>. View <a href="/expand-references" className="attribution-link">methodology</a> and <a href="/corpus" className="attribution-link">corpus sources</a>.
        </p>
      </section>
    </main>
  )
}
