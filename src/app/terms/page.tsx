export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-300 leading-relaxed">
      <h1 className="text-2xl font-bold text-white mb-2">Terms of Service</h1>
      <p className="text-gray-500 mb-10">Effective: 6 March 2026 · Operator: GodLocal, Ireland · <a href="mailto:support@godlocal.ai" className="text-blue-400 hover:underline">support@godlocal.ai</a></p>

      <Section title="1. Acceptance of Terms">
        By accessing or using GodLocal at godlocal.ai, you agree to these Terms. If you do not agree, do not use the Service.
      </Section>

      <Section title="2. Description of Service">
        GodLocal is an AI-powered platform providing conversational AI (OASIS Council), crypto trading tools (SMERTCH, WOLF), and community features. The Service is for informational and productivity purposes only.
      </Section>

      <Section title="3. Eligibility">
        You must be at least 18 years old to use the Service.
      </Section>

      <Section title="4. Subscription and Payments">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Free Tier:</strong> 3 requests/day at no cost.</li>
          <li><strong className="text-white">Pro Plan:</strong> €9/month, unlimited access.</li>
          <li>Payments processed via Stripe. Subscriptions renew monthly until cancelled.</li>
          <li>Refunds may be requested within 7 days — contact support@godlocal.ai.</li>
          <li>EU consumers have a 14-day withdrawal right under Directive 2011/83/EU.</li>
        </ul>
      </Section>

      <Section title="5. Acceptable Use">
        You agree not to use the Service for illegal purposes, to transmit harmful content, to reverse-engineer the platform, to harass other users, or to circumvent security measures.
      </Section>

      <Section title="6. Crypto & Financial Disclaimer">
        <p className="font-semibold text-yellow-400 mb-2">The Service does not provide financial, investment, legal, or tax advice.</p>
        Cryptocurrency markets are highly volatile. You assume full responsibility for any trading decisions. GodLocal is not a regulated financial services provider.
      </Section>

      <Section title="7. Intellectual Property">
        The Service and its content are owned by GodLocal. You retain ownership of content you submit, but grant GodLocal a licence to use it to provide the Service.
      </Section>

      <Section title="8. Privacy">
        Your use is subject to our <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
      </Section>

      <Section title="9. Disclaimers & Limitation of Liability">
        THE SERVICE IS PROVIDED AS IS WITHOUT WARRANTIES. TO THE MAXIMUM EXTENT PERMITTED BY LAW, GODLOCAL SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. Our total liability shall not exceed the amount you paid in the preceding 12 months or 50 EUR, whichever is greater.
      </Section>

      <Section title="10. Governing Law">
        These Terms are governed by the laws of Ireland. Disputes are subject to the exclusive jurisdiction of Irish courts.
      </Section>

      <Section title="11. Contact">
        support@godlocal.ai
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-white mb-3">{title}</h2>
      <div className="text-gray-400">{children}</div>
    </section>
  )
}
