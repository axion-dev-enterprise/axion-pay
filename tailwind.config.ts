import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./webapp/index.html', './webapp/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#04110d',
        ink: '#edf8f3',
        mist: '#8ba89b',
        line: '#163128',
        surface: '#081915',
        panel: '#0c211b',
        neon: {
          100: '#d5ffe8',
          200: '#b8ffd8',
          300: '#7ef5b4',
          400: '#38e48f',
          500: '#17c96f',
          600: '#0ea95b',
          700: '#0d7f48',
          800: '#0f5733',
          900: '#103924',
        },
        aqua: {
          300: '#82f7f3',
          400: '#4ad9d2',
          500: '#1aa5a1',
        },
        alert: {
          success: '#2dd881',
          warning: '#ffbe5c',
          danger: '#ff6f7d',
          info: '#42c7ff',
        },
      },
      boxShadow: {
        soft: '0 18px 60px rgba(0, 0, 0, 0.32)',
        glow: '0 0 0 1px rgba(56, 228, 143, 0.12), 0 22px 80px rgba(23, 201, 111, 0.18)',
        'glow-lg': '0 0 0 1px rgba(56, 228, 143, 0.22), 0 32px 120px rgba(23, 201, 111, 0.24)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.8rem',
      },
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      backgroundImage: {
        shell:
          'radial-gradient(circle at 15% 15%, rgba(56, 228, 143, 0.16), transparent 24%), radial-gradient(circle at 80% 10%, rgba(74, 217, 210, 0.12), transparent 28%), linear-gradient(180deg, rgba(2, 15, 12, 0.98), rgba(4, 17, 13, 1))',
      },
    },
  },
  plugins: [],
}

export default config
