import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Custom tokens only: overriding a default palette such as `cyan` stops its shades (cyan-300…) from being generated.
      colors: {
        ink: '#0b1f2e',
        brand: '#0ea5e9',
        petroleum: { 800: '#16384a', 900: '#102a35', 950: '#071923' },
      },
      boxShadow: { card: '0 8px 24px rgba(20, 48, 81, .06)', panel: '0 12px 30px rgba(0, 0, 0, .18)' },
    },
  },
  plugins: [],
};

export default config;
