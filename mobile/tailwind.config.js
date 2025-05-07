/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0068FF",
        "background-dark": "#f1f1f1",
        "text-primary": "#000000",
      },
      borderRadius: {
        button: "1.5rem",
      },
    },
  },
  plugins: [],
};
