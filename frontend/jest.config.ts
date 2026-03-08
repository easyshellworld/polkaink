import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: false,
    }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '\\.json$': '<rootDir>/src/__mocks__/jsonMock.js',
  },
  setupFiles: ['<rootDir>/src/__mocks__/setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

export default config;
