import type { Config } from '@jest/types';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Jest carga este archivo como ESM, así que nada de __dirname: los scripts de
// package.json corren siempre con cwd en apps/server.
// Mismo .swcrc que usa el build de webpack: decoradores legacy + CommonJS.
const swcOptions = JSON.parse(
  readFileSync(resolve(process.cwd(), '.swcrc'), 'utf-8'),
);

const config: Config.InitialOptions = {
  testEnvironment: 'node',
  rootDir: './',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@shared/core(.*)$': '<rootDir>/../../packages/shared/src$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  // SWC en lugar de ts-jest: transpila igual que el build y no duplica el
  // type-check, que ya hace `tsc --noEmit`.
  transform: {
    '^.+\.(t|j)s$': ['@swc/jest', swcOptions],
  },
  // Desde Nest 12 los paquetes de @nestjs son ESM-only. Node sabe hacer
  // require(esm), pero el runtime de Jest no, así que hay que transpilarlos.
  transformIgnorePatterns: ['/node_modules/\.pnpm/(?!@nestjs\+)'],
};

export default config;
