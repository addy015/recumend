/** @type {import('tailwindcss').Config} */
export default {
  // Scan HTML and React components for Tailwind classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Sharp edges everywhere (no rounded corners)
    borderRadius: {
      none: '0px',
      sm: '0px',
      DEFAULT: '0px',
      md: '0px',
      lg: '0px',
      xl: '0px',
      '2xl': '0px',
      '3xl': '0px',
      full: '0px',
    },
    extend: {
      // Dark zinc palette for UI background, cards, and borders
      colors: {
        dark: {
          bg: "#09090b",       // zinc-950
          card: "#18181b",     // zinc-900
          border: "#27272a",   // zinc-800
          hover: "#3f3f46",    // zinc-700
          text: "#f4f4f5",     // zinc-100
          muted: "#a1a1aa",    // zinc-400
        }
      }
    },
  },
  plugins: [],
}
