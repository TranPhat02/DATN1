/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',   // class-based: add 'dark' to <html>
  theme: {
    extend: {
      colors: {
        // Map to CSS variables from design system
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        accent: {
          400: '#f472b6',
          500: '#ec4899',
        },
        success: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
        teams: {
          rail: '#201f1e',       // Teams dark icon rail
          panel: '#252423',      // Teams dark nav panel
          content: '#201f1e',    // Teams dark main content
          active: '#6264a7',     // Teams purple active
          hover: 'rgba(255,255,255,0.06)',
          // Light variants
          'rail-light': '#f5f5f5',
          'panel-light': '#ebebeb',
          'content-light': '#ffffff',
          'active-light': '#6264a7',
          'hover-light': 'rgba(0,0,0,0.06)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        segoe: ['Segoe UI', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'teams': '4px',
      },
      boxShadow: {
        'teams': '0 2px 8px rgba(0,0,0,0.24)',
        'teams-lg': '0 8px 24px rgba(0,0,0,0.32)',
        'glow': '0 0 20px rgba(99,102,241,0.15)',
        'glow-lg': '0 0 40px rgba(99,102,241,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
