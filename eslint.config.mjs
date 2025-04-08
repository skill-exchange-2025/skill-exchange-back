// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // add unsafe calls allow
      '@typescript-eslint/no-unsafe-call': 'off',
      // add unsafe member access allow
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // add unsafe return allow
      '@typescript-eslint/no-unsafe-return': 'off',
      // add unsafe assignment allow
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // add unsafe argument allow
      '@typescript-eslint/no-unsafe-argument': 'off',
      "prettier/prettier": [
        "error",
        {
          "endOfLine": "auto"
        }
      ],
    },
  },
);