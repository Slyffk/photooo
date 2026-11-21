/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAF9F6',
          100: '#F5F3ED',
          200: '#EBE7DE',
          300: '#DDD7CA',
          400: '#C8BEAE',
          500: '#AFA392',
        },
        korean: {
          lavender: '#E6E6FA',
          pink: '#FFE4E1',
          mint: '#E0F2E9',
          butter: '#FFF8DC',
          charcoal: '#1A1A1A',
          graphite: '#2D2D2D',
          border: '#E8E8E8',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Prompt', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(0, 0, 0, 0.06)',
        'touch': '0 6px 20px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 25px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'flash': 'flash 0.5s ease-out',
        'pop': 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'pulse-subtle': 'pulseSubtle 2s infinite ease-in-out',
      },
      keyframes: {
        flash: {
          '0%': { opacity: '0.9', backgroundColor: '#FFFFFF' },
          '100%': { opacity: '0', backgroundColor: 'transparent' }
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      }
    },
  },
  plugins: [],
}
