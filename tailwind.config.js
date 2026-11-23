/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#eaf6ee',
        card: '#fff',
        ink: '#10271b',
        mute: '#53705f',
        line: '#d7e9dd',
        hatch: '#e8f4ec',
        hero: '#0b5d3b',
        hero2: '#14925a',
        gold: '#d4a017',
      }
    },
  },
  plugins: [],
}
