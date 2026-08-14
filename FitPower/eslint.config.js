import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}', '!chat-server.js', '!chat-auth.js', '!push-server.cjs', '!public/service-worker.js', '!ecosystem.config.cjs', '!public/firebase-messaging-sw.js'],
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
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['ecosystem.config.cjs', 'chat-server.js', 'chat-auth.js', 'push-server.cjs', 'mediasoup-server.js', 'proxy-server.js', 'public/service-worker.js', 'public/firebase-messaging-sw.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['public/service-worker.js', 'public/firebase-messaging-sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser, firebase: 'readonly' } },
  },
])
