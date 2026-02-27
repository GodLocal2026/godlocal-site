/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0C0F',
        foreground: '#E0E0E0',
        primary: '#00FF9D',
        'primary-dark': '#00CC7A',
        secondary: '#6C5CE7',
        muted: '#2A2A2A',
        border: '#333333',
        'card-bg': '#111316',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00FF9D, 0 0 10px #00FF9D' },
          '100%': { boxShadow: '0 0 20px #00FF9D, 0 0 40px #00FF9D' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backgroundImage: {
        'hero-gradient': 'radial-gradient(ellipse at center top, rgba(0,255,157,0.08) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
};