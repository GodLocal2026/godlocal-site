import { GITHUB_URL } from '@/lib/utils';
export default function AboutPage() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="container py-16 max-w-4xl mx-auto">
        <div className="text-center mb-16"><h1 className="text-4xl md:text-6xl font-extrabold mb-4">About <span className="text-primary">GodLocal</span></h1></div>
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-4">Mission</h2>
          <p className="text-foreground/60 text-lg leading-relaxed">Make AI sovereign and accessible. Every person should be able to run powerful AI models locally — without sending data to a cloud, without subscriptions, without vendor lock-in.</p>
          <blockquote className="mt-6 pl-4 border-l-2 border-primary text-foreground/40 italic">&ldquo;Your AI. Your machine.&rdquo;</blockquote>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[['~2.9k','Lines of code'],['18+','API endpoints'],['5','TieredRouter levels'],['2026','Founded']].map(([v,l])=>(
            <div key={l} className="card text-center"><div className="text-2xl font-extrabold text-primary mb-1">{v}</div><div className="text-xs text-foreground/40">{l}</div></div>
          ))}
        </div>
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-4">Open Source</h2>
          <p className="text-foreground/60 mb-4">GodLocal is MIT-licensed. Full source on GitHub.</p>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-outline">github.com/GODLOCAL/godlocal →</a>
        </div>
      </div>
    </div>
  );
}
