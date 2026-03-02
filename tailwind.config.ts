import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      colors: {
        surface: "#0f0f0f",
        panel: "#1a1a1a",
        border: "#2a2a2a",
        accent: "#22c55e",     // green-500
        muted: "#6b7280",      // gray-500
        danger: "#ef4444",     // red-500
        warning: "#f59e0b",    // amber-500
      },
    },
  },
  plugins: [],
};

export default config;
