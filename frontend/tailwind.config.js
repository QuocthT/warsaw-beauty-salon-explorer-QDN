/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body:    ["var(--font-body)"],
      },
      colors: {
        ink:    "#0f0f0f",
        cream:  "#f5f0e8",
        blush:  "#e8c4b8",
        rose:   "#c4614a",
        gold:   "#c9a84c",
        muted:  "#8a8078",
        border: "#e0d8cc",
      },
      animation: {
        "fade-up":   "fadeUp 0.4s ease forwards",
        "fade-in":   "fadeIn 0.3s ease forwards",
        "slide-in":  "slideIn 0.35s ease forwards",
      },
      keyframes: {
        fadeUp:  { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideIn: { "0%": { opacity: "0", transform: "translateX(20px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
      },
    },
  },
  plugins: [],
}
