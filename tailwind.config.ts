import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Helvetica Now"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        base: '#F9F6F1',
        surface: {
          '1': '#EDE4D4',
          '2': '#E1D2B7',
          '3': '#D5C9B5',
        },
        accent: {
          DEFAULT: '#566246',
          dark: '#475437',
          light: '#697857',
          muted: '#8FA07B',
        },
        ink: {
          DEFAULT: '#151811',
          secondary: '#4A4A3D',
          muted: '#6B6B5E',
          faint: '#9B9B8E',
        },
      },
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        md: ['15px', { lineHeight: '22px' }],
        lg: ['16px', { lineHeight: '24px' }],
        xl: ['18px', { lineHeight: '26px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}

export default config
