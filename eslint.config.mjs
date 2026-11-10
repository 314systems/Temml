import { fileURLToPath } from 'node:url';

import globals from 'globals';
import js from '@eslint/js';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
  includeIgnoreFile(gitignorePath, { gitignoreResolution: true }),
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
    files: ['**/*.{js,ts}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    rules: {
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        { allowConstantLoopConditions: 'only-allowed-literals' },
      ],
    },
    languageOptions: {
      parser: tseslint.parser,
      // https://typescript-eslint.io/getting-started/typed-linting
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
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
