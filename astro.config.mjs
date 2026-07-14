import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://chacy5.github.io',
  base: '/Koel-Vorn',
  output: 'static',
  integrations: [sitemap()],
});
