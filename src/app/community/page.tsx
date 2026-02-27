import { GITHUB_URL, TWITTER_URL } from "@/lib/utils";
export default function CommunityPage() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Join the <span className="text-[#00FF9D]">community</span></h1>
          <p className="text-[#E0E0E0]/50 text-xl max-w-2xl mx-auto">Builders, tinkerers, and AI enthusiasts.</p>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Twitter / X</h2>
            <div className="space-y-3">
              {[["@kitbtc","Main account. Announcements, builds, demos.",TWITTER_URL],["@GodLocalDev","Developer updates, commits, tech deep-dives.","https://x.com/GodLocalDev"]].map(([handle,desc,href]) => (
                <a key={handle} href={href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-4 p-3 rounded-lg border border-[#333] hover:border-[#00FF9D]/30 transition-all">
                  <span className="text-[#00FF9D] font-mono font-bold">{handle}</span>
                  <span className="text-sm text-[#E0E0E0]/50">{desc}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-bold mb-4">GitHub</h2>
            <p className="text-[#E0E0E0]/50 mb-4">Star the repo, open issues, submit PRs.</p>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm">github.com/GodLocal2026 →</a>
          </div>
          <div className="card opacity-60">
            <h2 className="text-xl font-bold mb-2">Discord <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-[#6C5CE7]/10 text-[#6C5CE7] font-mono">soon</span></h2>
            <p className="text-sm text-[#E0E0E0]/40">Community server — developer help, agent showcases, AMAs.</p>
          </div>
        </div>
      </div>
    </div>
  );
}