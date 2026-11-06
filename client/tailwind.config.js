/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#05080D",
        "bg-secondary": "#0A1019",
        panel: "rgba(10, 17, 27, 0.88)",
        accent: "#40D9E8",
        "accent-secondary": "#438BFF",
        text: "#EAF2FA",
        "text-muted": "#8293A6",
        border: "rgba(120, 160, 190, 0.16)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 3s ease-in-out infinite alternate",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 10px rgba(64, 217, 232, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(64, 217, 232, 0.4)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
}
