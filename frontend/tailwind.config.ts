import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0B1F15",
          green: "#143D28",
          gold: "#D4AF37",
          "gold-light": "#E8D48B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
