import js from '@eslint/js';
import { Linter } from 'eslint';
import preact from 'eslint-config-preact';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['dist/', 'build/', 'node_modules/'],
  },
  js.configs.recommended,
  preact as unknown as Linter.Config, // reactHooks is already in preact
  ...tseslint.configs.recommended,
  {
    name: 'overrides_eslint',
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]);
