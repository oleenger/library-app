import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Page sits on a soft tinted canvas; surfaces are white and "raised"
        // above it, so the UI has depth instead of one flat white field.
        canvas: {
          DEFAULT: "#f1f4f1",
          warm: "#f6f4ef",
        },
        paper: {
          DEFAULT: "#ffffff",
          raised: "#ffffff",
          sunken: "#eef1ed",
          edge: "#e2e7e1",
        },
        ink: {
          DEFAULT: "#141b18",
          soft: "#4d5854",
          faint: "#88918b",
        },
        accent: {
          DEFAULT: "#1c6b50",
          soft: "#e3f0ea",
          ring: "#bfe0d1",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,27,24,0.04), 0 10px 24px -16px rgba(20,27,24,0.30)",
        cover:
          "0 2px 4px rgba(20,27,24,0.10), 0 16px 30px -14px rgba(20,27,24,0.55)",
        header: "0 1px 0 rgba(20,27,24,0.05), 0 8px 24px -20px rgba(20,27,24,0.4)",
      },
      fontFamily: {
        serif: ["'Iowan Old Style'", "'Baskerville'", "Georgia", "serif"],
        sans: ["'Avenir Next'", "'Helvetica Neue'", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
