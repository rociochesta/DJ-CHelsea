/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'karaoke-bg': '#0f0f1e',
        'karaoke-card': '#1a1a2e',
        'karaoke-accent': '#e94560',
        'karaoke-secondary': '#533483',
      }
    },
  },
  plugins: [],
}
