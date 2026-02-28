import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GodLocal Oasis — 7 Agents',
  description: 'Live AI chat with 7 autonomous GodLocal agents.',
}

export default function OasisLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
