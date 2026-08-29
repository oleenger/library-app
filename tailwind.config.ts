import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#f3f0e9",
          raised: "#fffefa",
          edge: "#d9d5cc",
        },
        ink: {
          DEFAULT: "#171713",
          soft: "#5e5c55",
          faint: "#8d8a81",
        },
        accent: "#e7472e",
      },
      fontFamily: {
        serif: ["'Iowan Old Style'", "'Baskerville'", "'Times New Roman'", "serif"],
        sans: ["'Avenir Next'", "'Helvetica Neue'", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
