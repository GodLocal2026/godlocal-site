import type { Metadata } from 'next';
import '../styles/globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'GodLocal – Your AI. Your machine.',
  description: 'The fastest local AI inference platform. Open source. Runs on iPhone. 17k tok/s, autonomous agents, full developer stack.',
  openGraph: {
    title: 'GodLocal – Your AI. Your machine.',
    description: 'The fastest local AI inference platform. 17k tok/s. Open source. iPhone ready.',
    url: 'https://godlocal.ai', siteName: 'GodLocal', type: 'website',
  },
  twitter: { card: 'summary_large_image', site: '@GodLocal', title: 'GodLocal – Your AI. Your machine.' },
  metadataBase: new URL('https://godlocal.ai'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
