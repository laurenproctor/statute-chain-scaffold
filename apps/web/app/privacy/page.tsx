export const metadata = {
  title: 'Privacy Policy — Greyledge',
  description: 'How Greyledge collects, uses, and protects your information.',
}

export default function PrivacyPage() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="page-eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="tagline">Last updated April 17, 2026.</p>
      </header>

      <div className="prose">
        <p>
          This Privacy Policy describes how Greyledge LLC ("Greyledge," "we," "us," or "our"), a
          Delaware limited liability company, collects, uses, and shares information about you when
          you access or use greyledge.com and its related services (the "Service"). By using the
          Service, you agree to the practices described in this policy.
        </p>

        <h2>1. Information We Collect</h2>
        <p><strong>Information you provide.</strong> When you use the Service, you may provide
        information such as statutory citations and search queries entered into the platform,
        contact information submitted through inquiry or sign-up forms, and any correspondence
        you send us directly.</p>
        <p><strong>Information collected automatically.</strong> We and our third-party service
        providers automatically collect certain technical data when you visit the Service,
        including your IP address, browser type and version, operating system, referring URLs,
        pages visited, time spent on pages, and timestamps of requests. This data is collected
        through cookies, web beacons, and similar tracking technologies.</p>

        <h2>2. Cookies and Tracking Technologies</h2>
        <p>
          We use the following categories of cookies and tracking tools:
        </p>
        <ul>
          <li>
            <strong>Essential cookies</strong> — required for the Service to function, such as
            session management. These cannot be disabled.
          </li>
          <li>
            <strong>Analytics cookies</strong> — we use <strong>Google Analytics</strong> and
            <strong> Microsoft Clarity</strong> to understand how visitors interact with the
            Service, including pages visited, session duration, and navigation patterns. Google
            Analytics may set cookies such as <code>_ga</code> and <code>_gid</code>. Microsoft
            Clarity records session replays and heatmaps to help us improve usability.
          </li>
          <li>
            <strong>Advertising cookies</strong> — we use <strong>Google Ads</strong> and{' '}
            <strong>LinkedIn Ads</strong> to measure the effectiveness of our marketing campaigns
            and, where applicable, to show relevant advertisements on third-party platforms. These
            services may set cookies or use pixels to track conversions and build audience segments.
          </li>
        </ul>
        <p>
          You can control cookies through your browser settings or opt out of Google Analytics
          measurement via the{' '}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
            Google Analytics Opt-out Browser Add-on
          </a>
          . LinkedIn members can manage ad preferences in their LinkedIn account settings. Microsoft
          Clarity data practices are described in{' '}
          <a href="https://privacy.microsoft.com/en-us/privacystatement" target="_blank" rel="noopener noreferrer">
            Microsoft's Privacy Statement
          </a>.
        </p>

        <h2>3. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Deliver, operate, and improve the Service and its legal reference features</li>
          <li>Analyze usage patterns and optimize platform performance</li>
          <li>Measure advertising campaign effectiveness and attribution</li>
          <li>Respond to inquiries and provide customer support</li>
          <li>Send product updates or announcements where you have opted in</li>
          <li>Detect and prevent fraud, abuse, or security incidents</li>
          <li>Comply with applicable legal obligations</li>
        </ul>

        <h2>4. How We Share Your Information</h2>
        <p>
          We do not sell your personal information. We may share information with:
        </p>
        <ul>
          <li>
            <strong>Service providers</strong> — including Vercel, Inc. (infrastructure and
            hosting), Google LLC (analytics and advertising), LinkedIn Corporation (advertising),
            and Microsoft Corporation (session analytics), each acting under data processing
            agreements and bound by confidentiality obligations.
          </li>
          <li>
            <strong>Legal and regulatory authorities</strong> — if required by law, court order,
            or to protect the rights, property, or safety of Greyledge, our users, or the public.
          </li>
          <li>
            <strong>Business transfers</strong> — in connection with a merger, acquisition, or
            sale of all or a portion of our assets, in which case your information may be
            transferred as part of that transaction.
          </li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>
          We retain personal information for as long as necessary to provide the Service and fulfill
          the purposes described in this policy, unless a longer retention period is required by law.
          Query and session data collected for analytics is subject to the retention settings of the
          respective third-party providers (e.g., Google Analytics default retention is 14 months).
          You may request deletion of your data at any time by contacting us.
        </p>

        <h2>6. Security</h2>
        <p>
          We implement reasonable technical and organizational safeguards designed to protect your
          information from unauthorized access, disclosure, alteration, or destruction. The Service
          is hosted on Vercel's infrastructure, which maintains industry-standard security
          certifications. However, no method of transmission over the internet is completely secure,
          and we cannot guarantee absolute security.
        </p>

        <h2>7. Your Privacy Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights with respect to your personal
          information, including the right to access, correct, delete, or restrict its processing,
          and the right to data portability. Residents of the European Economic Area, United Kingdom,
          and California may have additional rights under the GDPR, UK GDPR, and CCPA/CPRA
          respectively.
        </p>
        <p>
          To exercise any of these rights, please contact us at{' '}
          <a href="mailto:privacy@greyledge.com">privacy@greyledge.com</a>. We will respond within
          the timeframe required by applicable law.
        </p>

        <h2>8. Children's Privacy</h2>
        <p>
          The Service is not directed to children under the age of 13. We do not knowingly collect
          personal information from children. If you believe we have inadvertently collected
          information from a child, please contact us and we will promptly delete it.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The date at the top of this page
          indicates when it was last revised. Where changes are material, we will provide notice
          through the Service or by other means. Continued use of the Service after any update
          constitutes your acceptance of the revised policy.
        </p>

        <h2>10. Contact Us</h2>
        <p>
          If you have questions or concerns about this Privacy Policy or our data practices, please
          contact us at:
        </p>
        <p>
          Greyledge LLC<br />
          <a href="mailto:privacy@greyledge.com">privacy@greyledge.com</a>
        </p>
      </div>
    </main>
  )
}
