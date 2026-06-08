export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3B82F6",
        accent: "#EC4899",
        success: "#22C55E",
        dark: {
          bg: "#0F172A",
          card: "#1E293B"
        }
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 20px 70px rgba(59, 130, 246, 0.24)"
      }
    }
  },
  plugins: []
};
