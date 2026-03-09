/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // EcoStamp palette — deep forest + moss + cream
        forest:  { DEFAULT: '#1a3d2b', 50: '#f0f7f2', 100: '#dceee3', 200: '#b3d9c2', 300: '#7fbfa0', 400: '#4da07d', 500: '#2d7a5b', 600: '#1f5e45', 700: '#1a3d2b', 800: '#142f21', 900: '#0d1f16' },
        moss:    { DEFAULT: '#4a7c59', 50: '#f2f7f3', 100: '#e0eee4', 200: '#bddac6', 300: '#8fbfa0', 400: '#5e9e78', 500: '#4a7c59', 600: '#3a6248', 700: '#2e4e38', 800: '#243e2c', 900: '#1a2e20' },
        sage:    { DEFAULT: '#8fad8f', 50: '#f5f8f5', 100: '#e8f0e8', 200: '#cfdecf', 300: '#adc6ad', 400: '#8fad8f', 500: '#6f8f6f', 600: '#587358', 700: '#455a45', 800: '#364536', 900: '#283528' },
        cream:   { DEFAULT: '#f5f0e8', 50: '#fdfcf9', 100: '#f9f6ef', 200: '#f5f0e8', 300: '#ede4d3', 400: '#e0d3b9', 500: '#cdb895', 600: '#b5966a', 700: '#8f7347', 800: '#6e5534', 900: '#4e3b23' },
        earth:   { DEFAULT: '#6b5c4e', 50: '#f8f5f3', 100: '#f0ece7', 200: '#ddd3ca', 300: '#c4b5a8', 400: '#a99386', 500: '#8c7464', 600: '#6b5c4e', 700: '#55493e', 800: '#413830', 900: '#2e2720' },
        glow:    { DEFAULT: '#a8e6b8', 50: '#f0fbf3', 100: '#ddf6e5', 200: '#b8ecc8', 300: '#a8e6b8', 400: '#78d99a', 500: '#4bc97d', 600: '#35a664', 700: '#297e4d', 800: '#20633c', 900: '#174a2d' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'leaf-texture':      "url('/textures/leaf.svg')",
        'forest-gradient':   'linear-gradient(135deg, #1a3d2b 0%, #2d7a5b 50%, #4a7c59 100%)',
        'earth-gradient':    'linear-gradient(160deg, #0d1f16 0%, #1a3d2b 60%, #2e4e38 100%)',
        'glow-radial':       'radial-gradient(ellipse at top, #4da07d22 0%, transparent 70%)',
        'stamp-shine':       'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)',
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'pulse-glow':  'pulse-glow 3s ease-in-out infinite',
        'fade-up':     'fade-up 0.6s ease-out forwards',
        'fade-in':     'fade-in 0.4s ease-out forwards',
        'stamp-drop':  'stamp-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'shimmer':     'shimmer 2s linear infinite',
        'leaf-sway':   'leaf-sway 4s ease-in-out infinite',
        'orbit':       'orbit 20s linear infinite',
      },
      keyframes: {
        float:        { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        'pulse-glow': { '0%,100%': { opacity: '0.6', transform: 'scale(1)' }, '50%': { opacity: '1', transform: 'scale(1.05)' } },
        'fade-up':    { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
        'stamp-drop': { from: { opacity: '0', transform: 'scale(0.5) rotate(-15deg)' }, to: { opacity: '1', transform: 'scale(1) rotate(0deg)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'leaf-sway':  { '0%,100%': { transform: 'rotate(-3deg)' }, '50%': { transform: 'rotate(3deg)' } },
        orbit:        { from: { transform: 'rotate(0deg) translateX(60px) rotate(0deg)' }, to: { transform: 'rotate(360deg) translateX(60px) rotate(-360deg)' } },
      },
      backdropBlur: { xs: '2px' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
    },
  },
  plugins: [],
};
