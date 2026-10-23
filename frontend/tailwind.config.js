import legacyTheme from './tailwind-legacy-theme.json' with { type: 'json' }

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      // Preserve YaZoo's existing palette, typography and effect scales.
      ...legacyTheme,
      opacity: {
        6: '0.06',
        7: '0.07',
        8: '0.08',
        12: '0.12',
        14: '0.14',
        15: '0.15',
        16: '0.16',
        18: '0.18',
        24: '0.24',
        28: '0.28',
        32: '0.32',
        35: '0.35',
        45: '0.45',
        46: '0.46',
        55: '0.55',
        56: '0.56',
        58: '0.58',
        62: '0.62',
        64: '0.64',
        65: '0.65',
        66: '0.66',
        68: '0.68',
        72: '0.72',
        74: '0.74',
        76: '0.76',
        78: '0.78',
        82: '0.82',
        84: '0.84',
        85: '0.85',
        86: '0.86',
        88: '0.88',
        92: '0.92',
        94: '0.94',
        96: '0.96',
        97: '0.97',
        98: '0.98',
      },
    },
  },
  plugins: [({ addUtilities }) => {
    // In v3 responsive font-size utilities also reset line-height. Preserve
    // that cascade instead of inheriting a smaller-breakpoint --tw-leading.
    addUtilities(Object.fromEntries(Object.entries(legacyTheme.fontSize).map(([name, value]) => {
      const [fontSize, options] = value
      return [`.text-${name}`, { '--tw-leading': 'initial', fontSize, lineHeight: options.lineHeight }]
    })))
  }],
}
