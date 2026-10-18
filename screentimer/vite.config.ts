import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Content Security Policy for the built page. Scripts only come from the
 * bundle; the logo and the Etherpad FAQ may be loaded from any http(s) host.
 * Added at build time only, since the dev server relies on inline scripts.
 * Keep in sync with the header in nginx.conf: browsers enforce both.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: http:",
  "connect-src 'self' https: http:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// Relative base so the build works from any CDN path.
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
})
