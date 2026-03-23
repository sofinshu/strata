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
        background: {
          primary: "#0F1117",
          secondary: "#1A1D27",
          tertiary: "#242836",
          elevated: "#2D3241",
        },
        text: {
          primary: "#F0F0F3",
          secondary: "#8B8FA3",
          tertiary: "#5C6070",
        },
        accent: {
          DEFAULT: "#5865F2",
          hover: "#4752C4",
        },
        success: "#57F287",
        warning: "#FEE75C",
        error: "#ED4245",
        premium: "#F47FFF",
        enterprise: "#FFD700",
        info: "#5BC0EB",
        border: "#333845",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0,0,0,0.3)",
        dropdown: "0 10px 15px -3px rgba(0,0,0,0.4)",
        modal: "0 25px 50px -12px rgba(0,0,0,0.5)",
      },
      borderRadius: {
        card: "12px",
        button: "8px",
        input: "8px",
        badge: "6px",
        modal: "16px",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
      },
      backgroundImage: {
        "premium-gradient": "linear-gradient(135deg, rgba(244,127,255,0.08), rgba(88,101,242,0.08))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
