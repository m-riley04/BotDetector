/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  transform: {
    '\\.[jt]s$': '<rootDir>/jest.transform.cjs',
  },
};
