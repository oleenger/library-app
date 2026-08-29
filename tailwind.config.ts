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
          DEFAULT: "#f6f7f4",
          raised: "#ffffff",
          edge: "#dedfd9",
        },
        ink: {
          DEFAULT: "#18201d",
          soft: "#5b6560",
          faint: "#929a96",
        },
        accent: "#246b54",
      },
      fontFamily: {
        serif: ["'Iowan Old Style'", "'Baskerville'", "Georgia", "serif"],
        sans: ["'Avenir Next'", "'Helvetica Neue'", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
