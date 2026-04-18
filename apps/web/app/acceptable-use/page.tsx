export const metadata = {
  title: 'Acceptable Use Policy — Greyledge',
  description: 'Rules governing permitted and prohibited uses of the Greyledge platform.',
}

export default function AcceptableUsePage() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="page-eyebrow">Legal</p>
        <h1>Acceptable Use Policy</h1>
        <p className="tagline">Last updated April 17, 2026.</p>
      </header>

      <div className="prose">
        <p>
          This Acceptable Use Policy ("AUP") governs your use of greyledge.com and all related
          services operated by Greyledge LLC ("Greyledge," "we," "us," or "our") (collectively,
          the "Service"). This AUP is incorporated into and forms part of the{' '}
          <a href="/terms">Terms of Service</a>. Capitalized terms not defined here have the
          meanings given in the Terms of Service.
        </p>
        <p>
          This AUP is intended to protect the integrity and availability of the Service, safeguard
          the rights of other users and third parties, and ensure that Greyledge can be used
          effectively by legal professionals who depend on it.
        </p>

        <h2>1. Permitted Uses</h2>
        <p>
          The Service is designed for lawful legal research and reference by licensed legal
          professionals and their supervised staff. Permitted uses include:
        </p>
        <ul>
          <li>Searching, resolving, and reviewing statutory and regulatory citations;</li>
          <li>Tracing chains of legal authority and cross-references between provisions;</li>
          <li>Comparing statutory text across jurisdictions for legal analysis;</li>
          <li>Reviewing corpus coverage and provision metadata in connection with a legal matter;</li>
          <li>Incorporating retrieved statutory text into legal work product in accordance with
          applicable professional conduct rules and citation standards.</li>
        </ul>

        <h2>2. Prohibited Uses</h2>
        <p>
          You may not use the Service for any of the following:
        </p>

        <h2>Unauthorized Data Collection</h2>
        <ul>
          <li>Scraping, crawling, spidering, or indexing any portion of the Service through
          automated means, bots, scripts, or other programmatic access without Greyledge's prior
          written consent;</li>
          <li>Systematically downloading, harvesting, or bulk-extracting statutory text, reference
          graph data, citation mappings, or other structured content from the Service;</li>
          <li>Using the Service's output to build, populate, or augment any competing legal
          database, research product, or statutory compilation.</li>
        </ul>

        <h2>Artificial Intelligence and Machine Learning</h2>
        <ul>
          <li>Using content retrieved through the Service — including statutory text as
          organized, linked, and presented by Greyledge — to train, fine-tune, evaluate, or
          otherwise develop any artificial intelligence, machine learning, or large language model
          without our prior written consent;</li>
          <li>Using the Service as a data source for any automated legal reasoning, AI-generated
          legal advice, or autonomous decision-making product intended for external distribution,
          without a separate written agreement with Greyledge.</li>
        </ul>

        <h2>Unauthorized Commercial Use</h2>
        <ul>
          <li>Reselling, sublicensing, or redistributing access to the Service or any content
          retrieved from it to third parties without a written reseller or enterprise agreement
          with Greyledge;</li>
          <li>Using the Service to provide legal research services to third parties on a
          commercial basis (e.g., as a legal research vendor or outsourced research service)
          without our prior written authorization.</li>
        </ul>

        <h2>Credential and Access Abuse</h2>
        <ul>
          <li>Sharing login credentials with any other person or entity not covered by your
          subscription;</li>
          <li>Accessing the Service using credentials that are not yours, or assisting any
          unauthorized person in gaining access;</li>
          <li>Circumventing, disabling, or otherwise undermining any authentication, access
          control, rate limit, or security feature of the Service;</li>
          <li>Using the Service through a VPN, proxy, or other means to mask your identity or
          circumvent geographic or usage restrictions.</li>
        </ul>

        <h2>Interference and Abuse</h2>
        <ul>
          <li>Transmitting or uploading malware, viruses, or any code designed to damage,
          interfere with, or gain unauthorized access to the Service or any connected system;</li>
          <li>Engaging in any conduct that imposes an unreasonable or disproportionate load on
          the Service's infrastructure, as determined by Greyledge in its reasonable discretion;</li>
          <li>Attempting to probe, scan, penetration-test, or assess the vulnerability of the
          Service or its infrastructure without Greyledge's prior written authorization;</li>
          <li>Attempting to reverse-engineer, decompile, disassemble, or derive the source code,
          database structure, reference graph schema, or citation resolution methodology
          underlying the Service.</li>
        </ul>

        <h2>Unlawful and Harmful Conduct</h2>
        <ul>
          <li>Using the Service in violation of any applicable federal, state, or local law or
          regulation, including laws governing unauthorized access to computer systems (e.g., the
          Computer Fraud and Abuse Act);</li>
          <li>Using the Service in violation of applicable professional conduct rules, including
          rules governing competence, confidentiality, and supervision of non-lawyers;</li>
          <li>Engaging in harassment, fraud, impersonation, or any other conduct harmful to
          Greyledge, its users, or third parties;</li>
          <li>Using the Service in connection with any illegal activity or in a manner that
          facilitates harm to any person.</li>
        </ul>

        <h2>3. Consequences of Violation</h2>
        <p>
          Violation of this AUP may result in immediate suspension or termination of your access
          to the Service, without notice and without refund of any fees paid. Greyledge reserves
          the right to investigate suspected violations and to cooperate with law enforcement
          authorities where appropriate. We may also seek injunctive relief or other legal remedies
          for violations that cause or threaten harm to Greyledge or its users.
        </p>

        <h2>4. Reporting Violations</h2>
        <p>
          If you become aware of any use of the Service that violates this AUP, please report it
          to us at <a href="mailto:legal@greyledge.com">legal@greyledge.com</a>. We take all
          reports seriously and will investigate promptly.
        </p>

        <h2>5. Changes to This Policy</h2>
        <p>
          Greyledge may update this AUP from time to time. The date at the top of this page
          reflects the most recent revision. Material changes will be communicated through the
          Service or by email where practicable. Continued use of the Service after any update
          constitutes your acceptance of the revised AUP.
        </p>

        <h2>6. Contact</h2>
        <p>
          Questions about this AUP should be directed to:{' '}
          <a href="mailto:legal@greyledge.com">legal@greyledge.com</a>
        </p>
      </div>
    </main>
  )
}
