import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GodLocal AI — Smart Assistant',
  description: 'Live AI chat with 7 autonomous GodLocal agents.',
}

export default function AILayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Hide global site header & footer — GodLocal AI is a full-screen app */}
      <style dangerouslySetInnerHTML={{__html: `
        body > header { display: none !important; }
        body > footer { display: none !important; }
        body > main  { padding: 0 !important; margin: 0 !important; }
      `}} />
      {children}
    </>
  )
}
