import type { Config } from "tailwindcss";

/**
 * Design language tokens for Eliot OS.
 *
 * Monochrome forward: near black ink, warm off white paper, quiet mid gray.
 * Exactly one confident accent (a deep signal blue) used sparingly.
 * Restrained semantic colors for the triage queue states: go, hold, stop.
 *
 * Lane tone is expressed through spacing, type scale, and decoration density in
 * the components, not through a second palette. A refined dark theme is provided
 * for the operator and portfolio surfaces via the `dark` class.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core monochrome
        ink: {
          DEFAULT: "#14130f", // near black, warm
          soft: "#3a382f",
        },
        paper: {
          DEFAULT: "#f6f3ec", // warm off white
          raised: "#fffdf7",
        },
        gray: {
          rule: "#d9d4c7", // hairline rules on paper
          mut: "#8b8676", // secondary text
        },
        // The one confident accent: a deep signal blue
        accent: {
          DEFAULT: "#1f3df0",
          soft: "#4a60f4",
          ink: "#0c1a8c",
        },
        // Restrained semantics for the triage queue
        go: "#2f7d4f", // auto / clear / proceed
        hold: "#b5872a", // queue / needs review
        stop: "#b23b2e", // escalate / safety
        // Dark theme surfaces (operator + portfolio)
        night: {
          DEFAULT: "#101010",
          raised: "#181816",
          rule: "#2a2a26",
          mut: "#8d897c",
          paper: "#ece9e0",
        },
      },
      fontFamily: {
        // Refined grotesque for the interface
        sans: ["var(--font-grotesque)", "system-ui", "sans-serif"],
        // Editorial serif for large display moments
        display: ["var(--font-display)", "Georgia", "serif"],
        // Monospace seam for technical surfaces
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Confident large display scale with tight tracking applied per use
        "display-xl": ["clamp(3rem, 7vw, 6rem)", { lineHeight: "0.96", letterSpacing: "-0.03em" }],
        "display-lg": ["clamp(2.25rem, 4.5vw, 3.75rem)", { lineHeight: "1.0", letterSpacing: "-0.025em" }],
        "display-md": ["clamp(1.75rem, 3vw, 2.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        label: "0.14em", // section numerals and eyebrow labels
      },
      maxWidth: {
        editorial: "72rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        reveal: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        // Short, quiet, ease out. Honors reduced motion via globals.css.
        "fade-in": "fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        reveal: "reveal 0.5s ease-out both",
      },
      backgroundImage: {
        // Optional fine dot grid / blueprint underlay for technical surfaces
        "dot-grid":
          "radial-gradient(circle at 1px 1px, rgba(20,19,15,0.07) 1px, transparent 0)",
        "dot-grid-dark":
          "radial-gradient(circle at 1px 1px, rgba(236,233,224,0.06) 1px, transparent 0)",
      },
      backgroundSize: {
        dot: "22px 22px",
      },
    },
  },
  plugins: [],
};

export default config;
