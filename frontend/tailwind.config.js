/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 赛博庞克主色系 — 青色/电蓝
        primary: {
          50:  '#e0ffff',
          100: '#b3ffff',
          200: '#80ffff',
          300: '#4dfdff',
          400: '#26f7ff',
          500: '#00f0ff',
          600: '#00d4e5',
          700: '#00b3c4',
          800: '#00939e',
          900: '#006469',
        },
        // 强调色 — 紫罗兰
        accent: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        // 深色主题专用
        surface: {
          DEFAULT: '#0d0d1a',
          50:  '#1a1a2e',
          100: '#16162a',
          200: '#121226',
          300: '#0e0e20',
          400: '#0a0a1a',
          500: '#0d0d1a',
          600: '#080814',
          700: '#060610',
          800: '#04040c',
          900: '#020208',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,240,255,0.3), 0 0 20px rgba(0,240,255,0.1)' },
          '50%': { boxShadow: '0 0 10px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 5px rgba(0,240,255,0.2)',
        'glow': '0 0 15px rgba(0,240,255,0.3)',
        'glow-lg': '0 0 30px rgba(0,240,255,0.4)',
        'glow-purple': '0 0 15px rgba(168,85,247,0.3)',
      },
    },
  },
  plugins: [],
}
