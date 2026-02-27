import { GITHUB_URL, TWITTER_URL, TWITTER_RU_URL, TWITTER_DEV_URL } from '@/lib/utils';
const socials = [
  { handle:'@GodLocal', desc:'Main announcements, releases, community.', href:TWITTER_URL, icon:'🌐' },
  { handle:'@GodLocalRU', desc:'Russian-language community. Новости на русском.', href:TWITTER_RU_URL, icon:'🇷🇺' },
  { handle:'@GodLocalDev', desc:'Developer updates, commits, technical deep-dives.', href:TWITTER_DEV_URL, icon:'⚙️' },
  { handle:'@kitbtc', desc:'Founder. AMA sessions and behind-the-scenes.', href:'https://x.com/kitbtc', icon:'👤' },
];
export default function CommunityPage() {
  return (
    <div className="pt-16 min-h-screen">
      <div className="container py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Join the <span className="text-primary">community</span></h1>
        </div>
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-6">Follow on X</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {socials.map(s => (
              <a key={s.handle} href={s.href} target="_blank" rel="noopener noreferrer" className="card group hover:border-primary/30 hover:scale-105 transition-all duration-200">
                <div className="flex items-start gap-3"><span className="text-2xl">{s.icon}</span><div><div className="font-bold text-primary mb-1">{s.handle}</div><div className="text-sm text-foreground/50">{s.desc}</div></div></div>
              </a>
            ))}
          </div>
        </div>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Open Source</h2>
          <div className="card">
            <h3 className="font-bold text-lg mb-2">GODLOCAL/godlocal</h3>
            <p className="text-foreground/50 mb-4">Star the repo, open issues, submit PRs. All contributions welcome.</p>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm">View on GitHub →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
