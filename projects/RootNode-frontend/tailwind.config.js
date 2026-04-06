/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        base: '#0f1117',
        surface: '#1a1d27',
        border: '#2d3148',
      },
    },
  },
  plugins: [],
}
