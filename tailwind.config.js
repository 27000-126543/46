/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        parchment: {
          50: "#FDF8F0",
          100: "#F5ECD7",
          200: "#E8D5B0",
          300: "#D4BC85",
          400: "#C9A959",
          500: "#B8943F",
          600: "#9E7A2E",
          700: "#8B6914",
          800: "#6B4F0F",
          900: "#4A3608",
          950: "#2C1810",
        },
        bronze: {
          50: "#F9F3E7",
          100: "#EFE0C0",
          200: "#E0C78C",
          300: "#D4AF37",
          400: "#C9A01E",
          500: "#A88418",
          600: "#8B6914",
          700: "#6B4F0F",
          800: "#4A3608",
          900: "#2C1810",
        },
        ruin: {
          50: "#EFF5F1",
          100: "#D5E5D9",
          200: "#A9CCB1",
          300: "#7DB28A",
          400: "#4A7C59",
          500: "#385F44",
          600: "#2A4733",
          700: "#1C2F22",
          800: "#0F1811",
          900: "#070C08",
        },
        terracotta: {
          50: "#FBF0E8",
          100: "#F2D4BE",
          200: "#E4AE85",
          300: "#D6884D",
          400: "#A0522D",
          500: "#7C3F22",
          600: "#5D2F19",
          700: "#3E1F11",
          800: "#201008",
          900: "#100804",
        },
        sandstone: {
          50: "#FBF7EF",
          100: "#F0E2C6",
          200: "#E1C58D",
          300: "#D1A754",
          400: "#C9A959",
          500: "#A8873C",
          600: "#7E652C",
          700: "#54441E",
          800: "#2C1810",
          900: "#180C08",
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Cormorant Garamond"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        "parchment-texture":
          "radial-gradient(ellipse at center, rgba(212,175,55,0.05) 0%, transparent 70%), linear-gradient(180deg, #2C1810 0%, #1a0f08 100%)",
        "gold-shimmer":
          "linear-gradient(135deg, #D4AF37 0%, #F5ECD7 25%, #D4AF37 50%, #8B6914 75%, #D4AF37 100%)",
        "bronze-emboss":
          "linear-gradient(145deg, #a88418 0%, #8B6914 30%, #6B4F0F 70%, #4A3608 100%)",
      },
      boxShadow: {
        "gold-glow": "0 0 20px rgba(212, 175, 55, 0.4), 0 0 40px rgba(212, 175, 55, 0.2)",
        "bronze-emboss":
          "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.4)",
        "relic-card":
          "0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.2)",
      },
      animation: {
        "shimmer": "shimmer 2.5s linear infinite",
        "pulse-gold": "pulseGold 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "sand-flow": "sandFlow 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(212, 175, 55, 0.4)" },
          "50%": { boxShadow: "0 0 25px rgba(212, 175, 55, 0.8)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        sandFlow: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "100% 100%" },
        },
      },
    },
  },
  plugins: [],
};
