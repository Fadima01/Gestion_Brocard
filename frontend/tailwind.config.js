/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette de couleurs chaudes et or pour rappeler la préciosité du Brocard
        gold: {
          50: '#fbf9f4',
          100: '#f3edd9',
          200: '#e6d8b2',
          300: '#d5bd82',
          400: '#c4a157',
          500: '#b38634',
          600: '#986d27',
          700: '#79531e',
          800: '#60411a',
          900: '#4f3518',
          950: '#2d1c0b',
        },
        slate: {
          850: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      }
    },
  },
  plugins: [],
}
