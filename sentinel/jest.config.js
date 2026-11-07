/** @type {import('jest').Config} */
const config = {
  rootDir: __dirname,
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/test/fixtures/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/', '<rootDir>/dist/'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  coverageDirectory: '<rootDir>/../coverage/sentinel',
};

module.exports = config;
