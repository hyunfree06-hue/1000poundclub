import type { Config } from "tailwindcss";

// Design tokens for the raw, old-school forum look.
// One accent color only (#c0392b), hairline borders, 13px base, tight rhythm.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#c0392b",
        ink: "#222222",
        hairline: "#e5e5e5",
        muted: "#767676",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        // Base UI size for the whole board is 13px.
        base: ["13px", "1.5"],
        xs: ["11px", "1.4"],
        badge: ["10px", "1"],
      },
      borderRadius: {
        DEFAULT: "2px",
        none: "0",
      },
    },
  },
  plugins: [],
};

export default config;
