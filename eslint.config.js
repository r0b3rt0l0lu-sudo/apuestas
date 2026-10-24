import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**', 'src/games/**'],
    rules: {
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Usa core/rng.ts' }],
      'no-restricted-imports': ['error', { patterns: ['phaser'] }]
    }
  },
  { ignores: ['dist', 'node_modules'] }
];
