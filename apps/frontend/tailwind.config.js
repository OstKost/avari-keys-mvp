/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Cinzel', 'Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        avari: {
          base: '#06141B',
          surface: '#0A1D26',
          elevated: '#102833',
          input: '#0D222C',
          border: '#1C3945',
          borderSubtle: '#142D37',
          borderGold: 'rgba(217, 185, 110, 0.3)',
          text: {
            primary: '#F2F0E8',
            secondary: '#A8B4B7',
            muted: '#718187',
          },
          gold: {
            DEFAULT: '#D9B96E',
            light: '#F0D48D',
            dark: '#A98A48',
            glow: 'rgba(217, 185, 110, 0.15)',
          },
          emerald: '#55C878',
          amber: '#E5B85C',
          rose: '#D96868',
          cyan: '#6EA8C4',
        },
      },
      boxShadow: {
        'gold-glow': '0 0 25px -5px rgba(217, 185, 110, 0.25)',
        'gold-sm': '0 0 12px -2px rgba(217, 185, 110, 0.2)',
        'elven-card': '0 10px 30px -10px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(28, 57, 69, 0.8)',
        'elven-modal': '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 1px 1px rgba(217, 185, 110, 0.25)',
      },
      backgroundImage: {
        'elven-gradient': 'radial-gradient(circle at 50% 0%, rgba(16, 40, 51, 0.8) 0%, rgba(6, 20, 27, 0.95) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F0D48D 0%, #D9B96E 50%, #A98A48 100%)',
        'gold-subtle': 'linear-gradient(135deg, rgba(240, 212, 141, 0.12) 0%, rgba(217, 185, 110, 0.04) 100%)',
      },
    },
  },
  plugins: [],
}
