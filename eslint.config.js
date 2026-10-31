import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const HEX = '#[0-9a-fA-F]{3,8}\\b';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'prototype',
      'playwright-report',
      'test-results',
      'reports',
      'dev-dist',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      // A scrollable region must be focusable so keyboard users can scroll it; it is named with role=region.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'], tags: [] }],
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
    },
  },
  {
    // Design tokens only: colours come from the Tailwind theme / CSS variables, never literals.
    files: ['src/components/**/*.tsx', 'src/screens/**/*.tsx', 'src/sheets/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${HEX}/]`, message: 'Use a design token, not a hex colour.' },
        {
          selector: `TemplateElement[value.raw=/${HEX}/]`,
          message: 'Use a design token, not a hex colour.',
        },
      ],
    },
  },
  {
    files: ['tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'e2e/**', 'tools/**', 'src/test/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
