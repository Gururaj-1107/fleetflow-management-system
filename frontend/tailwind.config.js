/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '32px',
      },
      backdropBlur: {
        xs: '2px',
        DEFAULT: '20px',
        lg: '40px',
      },
      boxShadow: {
        glass: '0 10px 40px rgba(0,0,0,0.08)',
        'glass-hover': '0 20px 60px rgba(0,0,0,0.12)',
        glow: '0 0 20px rgba(102,126,234,0.5)',
        'glow-sm': '0 0 10px rgba(102,126,234,0.3)',
      },
      animation: {
        'mesh-move': 'meshMove 20s ease infinite',
        'gradient-shift': 'gradientShift 15s ease infinite',
        shimmer: 'shimmer 1.5s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'rotate-3d': 'rotate3d 20s linear infinite',
      },
      keyframes: {
        meshMove: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '50%': { transform: 'translate(40px,40px)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        rotate3d: {
          '0%': { transform: 'rotateY(0deg) rotateX(5deg)' },
          '100%': { transform: 'rotateY(360deg) rotateX(5deg)' },
        },
      },
    },
  },
  plugins: [],
}
