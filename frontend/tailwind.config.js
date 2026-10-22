/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d4d8e2',
          300: '#aab2c4',
          400: '#7a859d',
          500: '#565f78',
          600: '#3f4759',
          700: '#333a48',
          800: '#272d39',
          900: '#1d222c',
          950: '#131721',
        },
        accent: {
          50: '#eff7ff',
          100: '#daedff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#3392fb',
          600: '#1d73eef',
          700: '#175ecf',
          800: '#184fa6',
          900: '#1a4484',
          950: '#142a52',
        },
        surface: {
          DEFAULT: '#fbfbfa',
          card: '#ffffff',
          subtle: '#f5f5f4',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(19, 23, 33, 0.04), 0 1px 3px 0 rgba(19, 23, 33, 0.05)',
        'card-hover': '0 2px 6px 0 rgba(19, 23, 33, 0.06), 0 4px 12px 0 rgba(19, 23, 33, 0.05)',
        'sidebar': '4px 0 12px -4px rgba(19, 23, 33, 0.08)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
