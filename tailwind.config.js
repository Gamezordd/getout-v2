/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0d",
        surface: "#141418",
        "surface-2": "#1c1c22",
        "surface-3": "#22222a",
        accent: "#00e5a0",
        warn: "#ffbe3d",
        ink: "#f0f0f5",
        muted: "#5a5a70",
        live: "#ff3b5c",
        av1: "#7c5cbf",
        av2: "#3d8ef5",
        av3: "#e05c8a",
        av4: "#e07f2b",
        av5: "#4caf8a",
      },
      fontFamily: {
        syne: ["var(--font-syne)", "sans-serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      animation: {
        blink: "blink 1.4s ease-in-out infinite",
        "badge-pop": "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
        "chip-pop": "chipPop 0.25s cubic-bezier(0.16,1,0.3,1) both",
      },
      keyframes: {
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.3" } },
        badgePop: { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.4)" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        chipPop: {
          from: { opacity: "0", transform: "scale(0.86)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
