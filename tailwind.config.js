/** @type {import('tailwindcss').Config} */

const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundImage: {
        'radial-gradient':
          'radial-gradient(ellipse closest-side,var(--tw-gradient-stops))',
      },
      colors: {
        accent: colors.orange['500'],
        appBackground: colors.white,
        appForeground: colors.stone['700'],
        faded: colors.stone['500'],
        highlighted: colors.stone['200'],
        lightened: colors.stone['200'],
        neutral: colors.stone,
        primary: colors.blue,
        shaded: colors.stone['100'],
      },
    },
    fontFamily: {
      body: ['"Source Sans Pro"', 'sans-serif'],
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
