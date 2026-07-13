import type { Config } from "tailwindcss";

// Usa exactamente los colores definidos en 01_Design_System.md /
// design-tokens.css — no se agregan tonos nuevos acá.
const config: Config = {
  darkMode: ["class", '[data-mode="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        blue: {
          50: "#EFF6FF", 100: "#DBEAFE", 300: "#93C5FD",
          500: "#3B82F6", 700: "#1D4ED8", 900: "#1E3A8A",
        },
        cyan: {
          50: "#ECFEFF", 100: "#CFFAFE", 300: "#67E8F9",
          500: "#06B6D4", 700: "#0E7490", 900: "#164E63",
        },
        green: {
          50: "#F0FDF4", 100: "#DCFCE7", 300: "#86EFAC",
          500: "#22C55E", 700: "#15803D", 900: "#14532D",
        },
        orange: {
          50: "#FFF7ED", 100: "#FFEDD5", 300: "#FDBA74",
          500: "#F97316", 700: "#C2410C", 900: "#7C2D12",
        },
        red: {
          50: "#FEF2F2", 100: "#FEE2E2", 300: "#FCA5A5",
          500: "#EF4444", 700: "#B91C1C", 900: "#7F1D1D",
        },
      },
    },
  },
  plugins: [],
};

export default config;
