/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Geist', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      colors: { ink: { 900: '#0f1115', 700: '#2b2f38', 500: '#6b7280', 300: '#d5d8de', 100: '#f3f4f6' } },
    },
  },
  plugins: [],
}
