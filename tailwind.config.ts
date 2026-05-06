import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#030711',
          900: '#071024',
          800: '#0b1634',
          700: '#122553',
          500: '#2f6fff',
          300: '#82aaff'
        },
        signal: {
          green: '#60f0a8',
          blue: '#5cc8ff',
          amber: '#ffd166',
          red: '#ff6b7a'
        }
      },
      boxShadow: {
        glow: '0 0 32px rgba(92, 200, 255, 0.22)',
        soft: '0 20px 60px rgba(0, 0, 0, 0.35)'
      },
      animation: {
        pulseSignal: 'pulseSignal 2.2s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
        pop: 'pop 220ms ease-out'
      },
      keyframes: {
        pulseSignal: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(92,200,255,.0)' },
          '50%': { boxShadow: '0 0 34px 3px rgba(92,200,255,.28)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-180% 0' },
          '100%': { backgroundPosition: '180% 0' }
        },
        pop: {
          '0%': { transform: 'scale(0.85)' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' }
        }
      }
    }
  },
  plugins: []
};
export default config;
