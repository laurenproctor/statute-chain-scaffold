export const metadata = {
  title: 'Disclaimer — Greyledge',
  description: 'Important limitations on the use of Greyledge legal research content.',
}

export default function DisclaimerPage() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="page-eyebrow">Legal</p>
        <h1>Disclaimer</h1>
        <p className="tagline">Last updated April 17, 2026.</p>
      </header>

      <div className="prose">
        <h2>Not Legal Advice</h2>
        <p>
          Greyledge is a legal research and reference platform. The statutory text, regulatory
          citations, chain analyses, authority mappings, and all other content made available
          through greyledge.com (the "Service") are provided for informational and research
          purposes only.
        </p>
        <p>
          <strong>Nothing on this Service constitutes legal advice.</strong> No attorney-client
          relationship is created by your use of this Service, your submission of a query, or any
          communication with Greyledge LLC. The Service does not and cannot provide legal advice
          tailored to your specific facts, jurisdiction, or circumstances.
        </p>
        <p>
          If you require legal advice on a specific matter, you should consult a licensed attorney
          in the relevant jurisdiction.
        </p>

        <h2>Accuracy of Legal Content</h2>
        <p>
          Greyledge makes reasonable efforts to ensure that statutory and regulatory content is
          current and accurate. However, law changes frequently. Statutes are amended, repealed,
          and renumbered. Regulations are revised. Court decisions alter how provisions are
          interpreted. The Service may not reflect the most recent changes to a given provision,
          and coverage is not comprehensive across all jurisdictions.
        </p>
        <p>
          <strong>
            In all cases, official published versions of statutes and regulations — including
            those maintained by the U.S. Government Publishing Office, official state legislative
            databases, and other government sources — are the authoritative sources of law.
          </strong>{' '}
          You should verify all citations and statutory text against official sources before
          relying on them in any legal proceeding, submission, or advice.
        </p>
        <p>
          Greyledge LLC expressly disclaims any liability arising from errors, omissions, outdated
          content, or misinterpretation of statutory or regulatory text retrieved through the
          Service.
        </p>

        <h2>No Guarantee of Completeness</h2>
        <p>
          The reference graph and chain analysis features are designed to surface connections
          between statutory provisions as an aid to research. They do not guarantee that all
          relevant authorities, cross-references, supersessions, or interpretive sources have been
          identified. Legal research requires professional judgment. The Service is a tool to
          support that judgment — not replace it.
        </p>

        <h2>Jurisdiction</h2>
        <p>
          The Service covers select federal and state statutory codes. Coverage varies by
          jurisdiction and is subject to change. The presence of a jurisdiction's content on the
          Service does not imply that coverage is complete or that all provisions within that
          jurisdiction are included.
        </p>

        <h2>Third-Party Sources</h2>
        <p>
          Some content on the Service is derived from third-party government databases, public
          repositories, and other external sources. Greyledge does not control the accuracy or
          completeness of those sources and is not responsible for errors or omissions that
          originate with them.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, Greyledge LLC and its members,
          officers, employees, and agents shall not be liable for any damages — including direct,
          indirect, incidental, consequential, or punitive damages — arising from your reliance on
          content retrieved through the Service. Please review the full{' '}
          <a href="/terms">Terms of Service</a> for the complete limitation of liability applicable
          to your use.
        </p>

        <h2>Questions</h2>
        <p>
          If you have questions about this Disclaimer or the limitations of the Service, please
          contact us at{' '}
          <a href="mailto:legal@greyledge.com">legal@greyledge.com</a>.
        </p>
      </div>
    </main>
  )
}
