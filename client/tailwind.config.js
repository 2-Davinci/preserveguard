/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        farmGreen: {
          DEFAULT: '#0E7A3F', // Primary branding color
          light: '#EAF4EB',
          dark: '#0A5A2E'
        },
        farmOrange: '#F59E0B', // For 'High Demand' tags
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}