import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * ESLint flat config.
 *
 * `next lint` was removed in Next.js 16 — linting is plain ESLint now, which
 * means the project needs an `eslint.config.mjs` flat config. eslint-config-next
 * 16 ships flat config arrays directly, so there is no need for the
 * `@eslint/eslintrc` compatibility shim (which in fact fails on this config
 * with a circular-structure error).
 */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'public/**',
      '*.tsbuildinfo',
    ],
  },
  ...coreWebVitals,
  ...typescript,
]
