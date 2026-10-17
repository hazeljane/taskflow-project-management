/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: { colors: { peach: '#fff1e5', orange: '#f97316', caramel: '#c66b2b', ink: '#241b17' }, boxShadow: { soft: '0 12px 35px rgba(126, 65, 28, .08)' } } },
  plugins: []
};
