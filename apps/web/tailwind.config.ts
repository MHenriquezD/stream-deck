/** @type {import('tailwindcss').Config} */
import PrimeUi from 'tailwindcss-primeui'
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [PrimeUi],
}
