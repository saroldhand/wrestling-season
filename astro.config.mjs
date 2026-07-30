// @ts-check
import { defineConfig } from 'astro/config';
import { remarkWikilinks } from './src/lib/wikilinks.ts';

// Static output, zero client framework. The only JS on the site is small
// hand-written scripts (calendar drawer, library filters, service worker
// registration) — gym wifi is the constraint that decides this.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  markdown: {
    remarkPlugins: [remarkWikilinks],
  },
});
