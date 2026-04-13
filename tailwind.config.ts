import type { Config } from 'tailwindcss';
import flattenColorPalette from 'tailwindcss/lib/util/flattenColorPalette';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        aurora: 'aurora 60s linear infinite',
      },
      keyframes: {
        aurora: {
          from: {
            backgroundPosition: '50% 50%, 50% 50%',
          },
          to: {
            backgroundPosition: '350% 50%, 350% 50%',
          },
        },
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        warm: {
          50: '#fefcf7',
          100: '#fdf7ec',
          200: '#faf0d7',
          300: '#f5e6bc',
          400: '#eed89a',
          500: '#e4c570',
          600: '#d4a84b',
          700: '#b8893a',
          800: '#8f6828',
          900: '#5c4118',
        },
        charcoal: {
          50: '#f5f5f5',
          100: '#e8e8e8',
          200: '#d1d1d1',
          300: '#b4b4b4',
          400: '#8f8f8f',
          500: '#6b6b6b',
          600: '#4e4e4e',
          700: '#3d3d3d',
          800: '#2c2c2c',
          900: '#1a1a1a',
        },
        saffron: {
          50: '#fffbeb',
          100: '#fff3c4',
          200: '#ffe480',
          300: '#ffd03d',
          400: '#f8bc0f',
          500: '#f0a500',
          600: '#d48800',
          700: '#a96700',
          800: '#7a4a00',
          900: '#4d2e00',
        },
        sage: {
          50: '#f2f7f2',
          100: '#e0eee0',
          200: '#bfdbbf',
          300: '#95c195',
          400: '#6f9e6f',
          500: '#5a7a5a',
          600: '#47654a',
          700: '#374f3a',
          800: '#283829',
          900: '#182119',
        },
        success: {
          DEFAULT: '#16a34a', // green-600
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        error: {
          DEFAULT: '#dc2626', // red-600
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
    },
  },
  plugins: [addVariablesForColors],
};

// This plugin adds each Tailwind color as a global CSS variable, e.g. var(--gray-200).
// Required by the Aurora Background component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addVariablesForColors({ addBase, theme }: any) {
  const allColors = flattenColorPalette(theme('colors'));
  const newVars = Object.fromEntries(
    Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
  );

  addBase({
    ':root': newVars,
  });
}

export default config;
