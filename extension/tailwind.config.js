/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/popup/**/*.{tsx,html}'],
  theme: {
    extend: {
      colors: {
        'sw-bg': '#0a0a0f',
        'sw-bg2': '#13131a',
        'sw-teal': '#1D9E75',
        'sw-teal-hover': '#19886a',
        'sw-muted': '#6b7280',
        'sw-border': '#1f2937',
        'sw-text': '#e0e0e0',
        'sw-red': '#ef4444',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
