/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0190f3",
        secondary: "#f0f0f0",
      },
    },
  },
  plugins: [],
};
