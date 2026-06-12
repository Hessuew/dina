//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    // Local fast feedback for docs/rules/complexity.md. Warn-only: the hard block
    // lives in scripts/quality-gate.mjs (fallow `introduced` complexity).
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      complexity: ['warn', 20],
      'max-lines-per-function': [
        'warn',
        { max: 80, skipBlankLines: true, skipComments: true },
      ],
    },
  },
]
