import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm "reading room" ground: a soft paper-cream canvas with crisp
        // white surfaces raised above it, so the UI reads as pages on a desk.
        canvas: {
          DEFAULT: "#f4f1ea",
          warm: "#f7f4ee",
        },
        paper: {
          DEFAULT: "#ffffff",
          raised: "#fffdf9",
          sunken: "#efece3",
          edge: "#e6e0d4",
        },
        ink: {
          DEFAULT: "#1f1b14",
          soft: "#5b5346",
          faint: "#968d7c",
        },
        accent: {
          DEFAULT: "#1c6b50",
          soft: "#e5efe9",
          ring: "#bfe0d1",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,27,20,0.04), 0 12px 28px -18px rgba(31,27,20,0.28)",
        cover:
          "0 2px 4px rgba(31,27,20,0.10), 0 16px 30px -14px rgba(31,27,20,0.50)",
        header: "0 1px 0 rgba(31,27,20,0.05), 0 8px 24px -20px rgba(31,27,20,0.35)",
      },
      fontFamily: {
        serif: ["'Iowan Old Style'", "'Baskerville'", "Georgia", "serif"],
        sans: ["'Avenir Next'", "'Helvetica Neue'", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
