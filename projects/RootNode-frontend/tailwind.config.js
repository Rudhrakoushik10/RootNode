/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Light theme - Classic beige & olive
        beige: {
          50: '#FAF8F5',
          100: '#F5F5DC',
          200: '#E8E0D5',
          300: '#D4C9B8',
        },
        olive: {
          light: '#8FBC8F',
          DEFAULT: '#556B2F',
          dark: '#3D4A2D',
        },
        // Legacy names for compatibility
        base: '#FAF8F5',
        surface: '#E8E0D5',
        border: '#D4C9B8',
      },
    },
  },
  plugins: [],
}
