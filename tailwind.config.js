/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#101721',
        panelSoft: '#1a2431',
        accent: '#5ec2ff',
        accentStrong: '#2e8cff',
      },
      boxShadow: {
        premium: '0 20px 40px rgba(0, 0, 0, 0.45)',
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
