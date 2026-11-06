/** @type {import('tailwindcss').Config} */
export default {
  // Scan HTML and React components for Tailwind classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        canvas: "#F7F6F2",
        surface: "#FFFFFE",
        accent: {
          DEFAULT: "#2D6A4F",
          hover: "#22543D",
        },
      },
    },
  },
  plugins: [],
}
