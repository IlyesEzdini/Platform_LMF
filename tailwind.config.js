/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: { brand: { 50: '#eaf8fe', 100: '#d3f0fc', 500: '#00a8ec', 600: '#0080b8', 700: '#00669a' }, },
    },
  },
  plugins: [],
}
