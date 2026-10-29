/**
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  setupFiles: ['<rootDir>/tests/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '\\.([jt]sx?|mjs|css|wasm)$': '<rootDir>/jest.transform.cjs',
  },
  // Preact 11 ships ESM only, so Jest has to compile it too.
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/preact@|preact/)'],
};
