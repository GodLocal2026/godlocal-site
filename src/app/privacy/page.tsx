export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-sm text-gray-300 leading-relaxed">
      <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-10">Effective: 6 March 2026 · Data Controller: GodLocal, Ireland · privacy@godlocal.ai</p>

      <Section title="1. Data We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-white">Account data:</strong> Email, username, hashed password.</li>
          <li><strong className="text-white">Payment data:</strong> Billing info via Stripe (no card numbers stored).</li>
          <li><strong className="text-white">Usage data:</strong> Pages visited, features used, session duration.</li>
          <li><strong className="text-white">Technical data:</strong> IP address, browser type, device type.</li>
          <li><strong className="text-white">AI conversations:</strong> Messages sent to the AI (retained 90 days).</li>
        </ul>
      </Section>

      <Section title="2. Legal Basis (GDPR)">
        We process data under: Contract (account, payments, AI features), Legitimate Interest (security, analytics), Consent (marketing — withdraw anytime), Legal Obligation (compliance).
      </Section>

      <Section title="3. Data Sharing">
        We do not sell your data. We share it only with Stripe (payments), Groq (AI inference), Render/Vercel/Supabase (infrastructure), and law enforcement when legally required. All processors operate under GDPR-compliant agreements.
      </Section>

      <Section title="4. Data Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data — until deletion + 30 days</li>
          <li>Payment records — 7 years (legal requirement)</li>
          <li>AI conversation history — 90 days rolling</li>
          <li>Analytics logs — 12 months</li>
        </ul>
      </Section>

      <Section title="5. Your Rights (GDPR)">
        <p className="mb-2">As an EU/EEA resident you have the right to: access, rectify, erase, restrict processing, data portability, object to processing, and withdraw consent.</p>
        <p>Contact privacy@godlocal.ai — we respond within 30 days. You may also lodge a complaint with the Irish Data Protection Commission (dataprotection.ie).</p>
      </Section>

      <Section title="6. Security">
        Passwords are bcrypt-hashed. All transmission is over HTTPS/TLS.
      </Section>

      <Section title="7. International Transfers">
        Some providers are in the USA. We use Standard Contractual Clauses (SCCs) approved by the European Commission.
      </Section>

      <Section title="8. Cookies">
        We use essential cookies (auth/session), functional cookies (preferences), and anonymised analytics cookies. Control cookies via your browser settings.
      </Section>

      <Section title="9. Children">
        The Service is not for users under 18. We do not knowingly collect data from children.
      </Section>

      <Section title="10. Contact">
        privacy@godlocal.ai · godlocal.ai · Ireland
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
