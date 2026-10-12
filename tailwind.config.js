/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: {
        ink: { 900: '#0b2540', 700: '#2f4560', 500: '#64748b', 300: '#cfd9e3', 100: '#eef3f8' },
        brand: { 50: '#eaf8fe', 100: '#d3f0fc', 500: '#00a8ec', 600: '#00a8ec', 700: '#0090cf' },
      },
    },
  },
  plugins: [],
}