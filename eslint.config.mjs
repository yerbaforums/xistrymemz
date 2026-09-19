import nextConfig from 'eslint-config-next'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

const config = [
  ...nextConfig,
  {
    ignores: [".next", "out", "build", "prisma", "scripts", "**/*.js"],
  },
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "react-hooks": reactHooks,
    },
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // eslint-plugin-react-hooks v7 (shipped by eslint-config-next@16) enables
      // React Compiler-era experimental rules by default. This project does not
      // use the React Compiler (no babel-plugin-react-compiler), so they only
      // produce noise over established fetch-on-mount patterns. Disable them
      // explicitly and keep the classic rules (rules-of-hooks, exhaustive-deps).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/static-components": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/optimistic-actions": "off",
      "react-hooks/use-transition-when": "off",
    },
  },
]

export default config