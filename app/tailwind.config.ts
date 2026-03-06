import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      { DEFAULT: "#0A0A0F", 2: "#14141F", 3: "#1E1E2E" },
        surface: { DEFAULT: "rgba(255,255,255,0.04)", 2: "rgba(255,255,255,0.08)", 3: "rgba(255,255,255,0.12)" },
        accent:  { DEFAULT: "#A9FF00", light: "#C8FF4D", dark: "#88CC00", dim: "rgba(169,255,0,0.15)" },
        neon:    { green: "#00FFB2", red: "#FF3B5C", blue: "#3B82F6", cyan: "#06B6D4", amber: "#F59E0B" },
        glass:   { DEFAULT: "rgba(255,255,255,0.04)", hover: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.06)", "border-hover": "rgba(255,255,255,0.12)" },
        txt:     { primary: "#F1F1F4", secondary: "#8B8FA3", muted: "#4E5168" },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        card: "16px",
        "card-sm": "12px",
        "card-xs": "8px",
      },
      boxShadow: {
        glow:        "0 0 20px rgba(169,255,0,0.15), 0 0 60px rgba(169,255,0,0.05)",
        "glow-lg":   "0 0 40px rgba(169,255,0,0.2), 0 0 100px rgba(169,255,0,0.08)",
        "glow-neon": "0 0 20px rgba(0,255,178,0.15), 0 0 60px rgba(0,255,178,0.05)",
        "card":      "0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.05) inset",
        "card-hover": "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1) inset, 0 0 20px rgba(169,255,0,0.08)",
        "aura":      "0 0 80px 20px rgba(169,255,0,0.06)",
      },
      animation: {
        "aura-pulse":   "auraPulse 8s ease-in-out infinite",
        "aura-drift":   "auraDrift 20s ease-in-out infinite",
        "bloom":        "bloom 4s ease-in-out infinite",
        "float":        "float 6s ease-in-out infinite",
        "float-delay":  "float 6s ease-in-out 2s infinite",
        "float-slow":   "float 8s ease-in-out 1s infinite",
        "pulse-dot":    "pulseDot 2s ease-in-out infinite",
        "shimmer":      "shimmer 2s linear infinite",
        "glow-line":    "glowLine 3s ease-in-out infinite",
        "gradient-x":   "gradientX 6s ease infinite",
        "fade-in":      "fadeIn 0.5s ease-out",
        "slide-up":     "slideUp 0.5s ease-out",
      },
      keyframes: {
        auraPulse: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":      { opacity: "0.7", transform: "scale(1.05)" },
        },
        auraDrift: {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "25%":      { transform: "translate(30px, -20px) rotate(1deg)" },
          "50%":      { transform: "translate(-20px, 15px) rotate(-1deg)" },
          "75%":      { transform: "translate(15px, 25px) rotate(0.5deg)" },
        },
        bloom: {
          "0%, 100%": { opacity: "0.3", filter: "blur(60px)" },
          "50%":      { opacity: "0.6", filter: "blur(80px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":      { opacity: "1", transform: "scale(1.3)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glowLine: {
          "0%, 100%": { opacity: "0.3" },
          "50%":      { opacity: "0.8" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};

export default config;
