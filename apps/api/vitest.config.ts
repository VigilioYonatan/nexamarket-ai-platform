import {defineConfig} from 'vitest/config';
export default defineConfig({
 test:{
   environment:'node',
   setupFiles:['./test/setup-env.ts'],
   testTimeout:15_000,
   hookTimeout:30_000,
   reporters:['default'],
   coverage:{provider:'v8',reporter:['text','lcov'],include:['src/**/*.ts'],exclude:['src/main.ts','src/scripts/**']}
 }
});
