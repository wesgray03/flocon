import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Ignore root-level and utility JS scripts that intentionally use CommonJS
    '*.js',
    'scripts/**/*.js',
    // Ignore Supabase edge functions (Deno environment)
    'supabase/functions/**',
  ]),
]);

export default eslintConfig;
