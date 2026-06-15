/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        urdu: ['"Jameel Noori Nastaleeq"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}