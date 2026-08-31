import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  testEnvironment: 'node',
  rootDir: './',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@shared/core(.*)$': '<rootDir>/../../packages/shared/src$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
};

export default config;
