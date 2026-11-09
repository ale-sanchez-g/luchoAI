import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  { ignores: ['sentinel/dist/**', 'sentinel/test/fixtures/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // A disable comment that no longer suppresses anything must go, not linger as a blind spot.
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
];

export default eslintConfig;
