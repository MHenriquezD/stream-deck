// @ts-check
import eslint from '@eslint/js';
import vueTsConfig from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dev-dist',
      'android',
      'release',
      'node_modules',
      // Config del propio lint y scripts sueltos de build.
      'eslint.config.mjs',
      'vite.config.ts',
      'electron-main.mjs',
      'electron-preload.js',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // `essential` en vez de `recommended`: son las reglas que cazan errores
  // reales. Las de `recommended` que sobran son de formato de plantillas
  // (orden de atributos, saltos de línea) y reescribirían todos los .vue;
  // eso es trabajo de un formateador, no del lint.
  ...pluginVue.configs['flat/essential'],
  // Enseña al parser de Vue a leer TypeScript dentro de <script setup lang="ts">.
  ...vueTsConfig(),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    rules: {
      // El proyecto usa `any` a propósito en varios puentes con APIs nativas
      // (Capacitor, plugins); mismo criterio que en el server.
      '@typescript-eslint/no-explicit-any': 'off',
      // Los `_` de descarte son intencionales.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Los componentes de una sola palabra ya están asentados en el proyecto
      // (StreamButton, PickerModal…); renombrarlos ahora no aporta nada.
      'vue/multi-word-component-names': 'off',
      // Un `let` que se asigna una vez pero se lee antes desde un closure no
      // puede ser const; sin esto la regla lo marca igual.
      'prefer-const': ['error', { ignoreReadBeforeAssign: true }],
    },
  },
);
