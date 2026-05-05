/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#F2EDE4',
          card: '#FFFFFF',
          verified: '#E8F5EF',
          honest: '#FEF3E8',
        },
        primary: {
          900: '#1C3D30',
          700: '#2D5A47',
          500: '#4A8C6F',
          200: '#C8DDD5',
          100: '#E4F0EB',
        },
        honest: {
          600: '#D97706',
          400: '#F59E4A',
          100: '#FEF3E8',
        },
        heatmap: {
          verified: '#2D5A47',
          honest: '#F59E4A',
          empty: '#D9E8E0',
          today: '#FFFFFF',
        },
        text: {
          primary: '#1A2E25',
          secondary: '#6B8C7D',
          honest: '#D97706',
        },
      },
      fontFamily: {
        heading: ["'Lora'", 'serif'],
        body: ["'Inter'", 'sans-serif'],
      },
      borderRadius: {
        btn: '9999px',
        card: '16px',
        chip: '8px',
      },
    },
  },
  plugins: [],
}
