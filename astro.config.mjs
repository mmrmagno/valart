// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = process.env.SITE_URL ?? 'https://val.marc-os.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  build: {
    format: 'directory',
    assets: '_assets',
    inlineStylesheets: 'auto',
  },
  integrations: [react(), sitemap()],
  security: {
    csp: {
      algorithm: 'SHA-256',
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
    },
  },
});
