import { GITHUB_URL } from "@/lib/utils";
export default function AboutPage() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="container py-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">About <span className="text-[#00FF9D]">GodLocal</span></h1>
        </div>
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Mission</h2>
            <p className="text-[#E0E0E0]/60 text-lg leading-relaxed">Make AI sovereign and accessible. Run powerful models locally — no cloud, no subscription, no vendor lock-in.</p>
            <blockquote className="mt-6 pl-4 border-l-2 border-[#00FF9D] text-[#E0E0E0]/40 italic">"Your AI. Your machine."</blockquote>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[["~2.9k","Lines of code"],["18+","API endpoints"],["5","Router tiers"],["2026","Founded"]].map(([v,l]) => (
              <div key={l} className="card text-center">
                <div className="text-2xl font-extrabold text-[#00FF9D] mb-1">{v}</div>
                <div className="text-xs text-[#E0E0E0]/40">{l}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Open Source</h2>
            <p className="text-[#E0E0E0]/60 mb-4">MIT-licensed. Full source on GitHub. Contributions welcome.</p>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-outline">github.com/GodLocal2026 →</a>
          </div>
        </div>
      </div>
    </div>
  );
}