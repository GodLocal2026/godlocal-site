'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const projects = [
  {
    icon: '🧠',
    name: 'GodLocal AI',
    tagline: 'AI-ассистент с инструментами',
    description: 'Чат с GodLocal AI — поиск в интернете, тех. анализ, отправка в Telegram и Twitter. Thinking process + streaming.',
    href: '/ai',
    color: 'emerald',
    badge: 'Live',
  },
  {
    icon: '🧸',
    name: 'NEBUDDA',
    tagline: 'Социальная сеть нового поколения',
    description: 'Мессенджер с AI-ассистентом Буба, каналы и группы, голосовые сообщения, стикеры, реакции. Telegram-style.',
    href: '/nebudda',
    color: 'pink',
    badge: 'Live',
  },
  {
    icon: '🎮',
    name: 'CodeThinker',
    tagline: 'AI думает кодом',
    description: 'Chain-of-thought AI который решает задачи через код. Генерация, анализ, автоматизация — всё в одном интерфейсе.',
    href: '/ai',
    color: 'violet',
    badge: 'Beta',
  },
  {
    icon: '📱',
    name: 'Mobile App',
    tagline: 'GodLocal в кармане',
    description: 'Мобильное приложение React Native. Оффлайн AI, NEBUDDA чат, голосовые команды — прямо на телефоне.',
    href: '#',
    color: 'cyan',
    badge: 'Soon',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string; badgeBg: string }> = {
  emerald: { bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'hover:shadow-emerald-500/10', badgeBg: 'bg-emerald-500/[0.15]' },
  pink:    { bg: 'bg-pink-500/[0.08]',    border: 'border-pink-500/20',    text: 'text-pink-400',    glow: 'hover:shadow-pink-500/10',    badgeBg: 'bg-pink-500/[0.15]' },
  violet:  { bg: 'bg-violet-500/[0.08]',  border: 'border-violet-500/20',  text: 'text-violet-400',  glow: 'hover:shadow-violet-500/10',  badgeBg: 'bg-violet-500/[0.15]' },
  cyan:    { bg: 'bg-cyan-500/[0.08]',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    glow: 'hover:shadow-cyan-500/10',    badgeBg: 'bg-cyan-500/[0.15]' },
};

export default function Projects() {
  return (
    <section id="projects" className="py-24 bg-[#07090f] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/80 text-xs font-mono mb-5">
            Ecosystem · Live Products
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Наши{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
              проекты
            </span>
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Экосистема GodLocal — AI, соцсеть, инструменты. Всё работает.
          </p>
        </motion.div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {projects.map((project, i) => {
            const c = colorMap[project.color] || colorMap.emerald;
            const isLink = project.href !== '#';
            const cardClasses = `group block p-6 rounded-2xl border ${c.border} bg-white/[0.02] backdrop-blur-sm
                    ${isLink ? 'cursor-pointer hover:bg-white/[0.04] hover:scale-[1.01] hover:shadow-2xl ' + c.glow : 'opacity-70 cursor-default'}
                    transition-all duration-300`;

            const cardContent = (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center text-2xl shrink-0`}>
                      {project.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{project.name}</h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${c.badgeBg} ${c.text}`}>
                          {project.badge}
                        </span>
                      </div>
                      <div className={`text-xs ${c.text} font-medium`}>{project.tagline}</div>
                    </div>
                  </div>
                  {isLink && (
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 mt-1"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{project.description}</p>
              </>
            );

            return (
              <motion.div
                key={project.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {isLink ? (
                  <Link href={project.href} className={cardClasses}>{cardContent}</Link>
                ) : (
                  <div className={cardClasses}>{cardContent}</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
