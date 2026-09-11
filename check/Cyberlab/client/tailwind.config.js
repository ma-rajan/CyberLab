/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07111f',
        panel: '#0d1b2a',
        cyber: '#22d3ee',
        signal: '#a3e635',
      },
    },
  },
  plugins: [],
};
