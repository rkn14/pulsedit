/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#12141a',
          raised: '#1a1d26',
          border: '#2a2f3c',
        },
        /** Texte secondaire — légèrement plus chaud que zinc pur */
        muted: {
          DEFAULT: '#a1a1aa',
          soft: '#71717a',
        },
      },
    },
  },
  plugins: [],
}
