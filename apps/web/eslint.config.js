import { config } from '@repo/eslint-config/react';

export default [
  ...config,
  { ignores: ['src/routeTree.gen.ts'] },
  {
    // shadcn components export variants alongside components.
    files: ['src/components/ui/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
];
