/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F2F3F1',
          50: '#FFFFFF',
          100: '#F8F9F7',
          200: '#F2F3F1',
          300: '#E1E3DF',
          400: '#C8CCC4',
          500: '#A4ABA0',
        },
        ink: {
          DEFAULT: '#14171A',
          light: '#2A2F35',
          muted: '#657786',
          border: '#D1D5DB',
        },
        navy: {
          DEFAULT: '#14213D',
          dark: '#0B132B',
          light: '#1F315B',
          50: '#E8EBF2',
        },
        teal: {
          DEFAULT: '#0F8B8D',
          dark: '#0B6869',
          light: '#14A3A5',
          50: '#E6F4F4',
          100: '#CCE8E9',
        },
        stamp: {
          DEFAULT: '#B23A2E',
          dark: '#8C2B22',
          light: '#D34D3F',
          50: '#F9ECEB',
        },
        ochre: {
          DEFAULT: '#C98A2C',
          dark: '#9F6C20',
          light: '#E09F3E',
          50: '#FAF3E8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(20, 23, 26, 0.03)',
        'xs': '0 1px 2px 0 rgba(20, 23, 26, 0.05)',
      },
    },
  },
  plugins: [],
};
