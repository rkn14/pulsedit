import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

/** CSP : supprime l’avertissement Electron « no CSP / unsafe-eval » en prod ; dev autorise Vite + HMR. */
function contentSecurityPolicyPlugin(): Plugin {
  const isDev = process.env.NODE_ENV !== 'production'

  const devCsp = [
    "default-src 'none'",
    "script-src 'self' 'unsafe-inline' http://127.0.0.1:* http://localhost:*",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:* wss://127.0.0.1:* wss://localhost:*",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
  ].join('; ')

  const prodCsp = [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'none'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
  ].join('; ')

  const csp = isDev ? devCsp : prodCsp

  return {
    name: 'pulsedit-csp',
    transformIndexHtml(html) {
      const meta = `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n`
      return html.replace('<head>', `<head>\n${meta}`)
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.js',
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
        '@shared': resolve('src/shared'),
        '@audio': resolve('src/audio'),
        '@workers': resolve('src/workers'),
      },
    },
    plugins: [react(), contentSecurityPolicyPlugin()],
  },
})
