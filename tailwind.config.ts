import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper tones rather than pure white (proposal §12).
        paper: {
          DEFAULT: "#f7f3ec",
          raised: "#fdfbf6",
          edge: "#e7ded0",
        },
        ink: {
          DEFAULT: "#2b2722",
          soft: "#6b6357",
          faint: "#9a9284",
        },
      },
      fontFamily: {
        serif: ["Georgia", "'Iowan Old Style'", "'Times New Roman'", "serif"],
        sans: ["system-ui", "-apple-system", "'Segoe UI'", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
