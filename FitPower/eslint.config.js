import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}', '!chat-server.js', '!public/service-worker.js'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['chat-server.js', 'mediasoup-server.js', 'proxy-server.js', 'public/push-server.cjs', 'public/service-worker.js', 'public/firebase-messaging-sw.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/service-worker.js', 'public/firebase-messaging-sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
  },
])
