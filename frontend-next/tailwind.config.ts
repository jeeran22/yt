import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1440px" } },
    extend: {
      colors: {
        graphite: { 950: "#090D16", 900: "#0B0F19", 850: "#101624", 800: "#151C2E", 750: "#1A2236", 700: "#1E293B" },
        cyanx: { DEFAULT: "#06B6D4", soft: "rgba(6,182,212,0.14)", glow: "rgba(6,182,212,0.45)" },
        violetx: { DEFAULT: "#A855F7", soft: "rgba(168,85,247,0.14)", glow: "rgba(168,85,247,0.45)" },
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
      },
      boxShadow: {
        glowcyan: "0 0 24px -6px rgba(6,182,212,0.55)",
        glowviolet: "0 0 24px -6px rgba(168,85,247,0.55)",
        card: "0 18px 40px -18px rgba(0,0,0,0.7)",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      keyframes: {
        pulseSoft: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.45" } },
        shimmer: { "0%": { backgroundPosition: "-400px 0" }, "100%": { backgroundPosition: "400px 0" } },
        rise: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
        rise: "rise .35s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
