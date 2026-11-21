import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'pitch-green': '#1a7f3c',
        'pitch-dark': '#0f5a2b',
        gold: '#ffb12f',
      },
      keyframes: {
        // A ring that grows and fades around what you can drag on the Game IQ pitch.
        'pitch-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.9' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        // The full-screen menu fades in rather than flashing over the page.
        'menu-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pitch-pulse': 'pitch-pulse 1.8s ease-out infinite',
        'menu-in': 'menu-in 150ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
