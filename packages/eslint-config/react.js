import globals from 'globals';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';
import { config as baseConfig } from './base.js';

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  ...baseConfig,
  pluginReactHooks.configs.flat['recommended-latest'],
  pluginReactRefresh.configs.vite,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];
