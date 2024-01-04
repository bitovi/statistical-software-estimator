module.exports = {
  content: ["./index.html","./estimator.js"],
  theme: {
    fontFamily: {
      "sans": 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      "serif": 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      "mono": 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      "bitovipoopins": 'Poppins, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
    },
    extend: {
      colors: {
        sky: {
          60: '#F3F7FD',
        },
        orange: {
          400: '#F5532D' // Bitovi color
        },
        yellow: {
          400: "#ffee80"
        },
        teal: {
          400: "#00a4b0"
        },
        green: {
          300: "#005156",
          400: "#00b059"
        },
        gray: {
          30: "#F8F8F8",
          100: "#E7E7E7"
        }
      }
    },
  },
  plugins: [],
}
