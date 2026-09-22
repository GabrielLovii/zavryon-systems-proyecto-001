import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#13263d',
        canvas: '#f4f7fb',
        line: '#e5ebf2',
        cyan: '#0ea5a8',
        petroleum: { 900: '#102a35', 950: '#071923' },
      },
      boxShadow: { card: '0 8px 24px rgba(20, 48, 81, .06)', panel: '0 12px 30px rgba(0, 0, 0, .18)' },
    },
  },
  plugins: [],
};

export default config;
