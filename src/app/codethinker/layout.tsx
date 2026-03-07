import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CodeThinker — AI думает кодом',
  description: 'Chain-of-thought AI для разработчиков. Vibe coding, архитектура, дебаг, рефакторинг. Думает → пишет → объясняет.',
}

export default function CodeThinkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide global site header & footer — CodeThinker is a full-screen app */}
      <style>{`header, footer { display: none !important; }`}</style>
      {children}
    </>
  )
}
