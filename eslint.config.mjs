import globals from 'globals';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig([
  {
    ignores: ['contrib/auto-render/test/*.js', 'src/autocorrect.js'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        BigInt: true,
      },

      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],

    rules: {
      // TypeScript checks these itself, or handles them better.
      'no-undef': 0,
      'no-dupe-class-members': 0,
      'no-unused-vars': 0,

      '@typescript-eslint/no-unused-vars': [
        2,
        {
          args: 'none',
          varsIgnorePattern: '^_*$',
        },
      ],
    },
  },
  {
    extends: [unicorn.configs.unopinionated],
    rules: {
      'unicorn/number-literal-case': 'off',
      'unicorn/prefer-ternary': 'off',
      'unicorn/prefer-string-raw': 'off',
    },
  },
  {
    files: [
      'src/buildMathML.ts',
      'src/environments/array.ts',
      'src/functions/font.ts',
      'src/functions/mclass.ts',
      'src/functions/operatorname.ts',
      'src/functions/tip.ts',
      'src/linebreaking.ts',
    ],
    rules: {
      // These builders traverse MathNode children, not browser DOM elements.
      'unicorn/better-dom-traversing': 'off',
    },
  },
]);
