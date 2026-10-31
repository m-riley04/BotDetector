/**
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  transform: {
    '\\.([jt]sx?|mjs|css)$': '<rootDir>/jest.transform.cjs',
  },
  // Preact 11 ships ESM only, so Jest has to compile it too.
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/preact@|preact/)'],
};
