import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist y android contienen artefactos de build (bundles minificados), no codigo fuente
  globalIgnores(['dist', 'android']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // permite descartes con prefijo _ (p.ej. const { campo: _omit, ...resto } = obj)
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // reglas experimentales de react-hooks v7: marcan patrones idiomaticos y correctos
      // (setState de carga dentro de un effect, ref-callback estable), no son errores reales
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      // diagnosticos del React Compiler (no usamos el compilador): el codigo es correcto
      // p.ej. Date.now() en render para marcar "cita pasada", o una memoizacion manual valida
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // exportar un hook o constante junto al componente solo afecta al fast-refresh de desarrollo
      'react-refresh/only-export-components': 'warn',
    },
  },
])
