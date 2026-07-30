// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { remarkWikilinks } from './src/lib/wikilinks.ts';

/**
 * Emit dist/sw.js from src/sw-template.js with a precache list of every
 * built page and asset, so the whole season works on the mat-room iPad with
 * the wifi dead. The cache name is a hash of the list: any deploy that
 * changes content installs a fresh worker and drops the old cache.
 */
function serviceWorker() {
  return {
    name: 'wrestling-hq-sw',
    hooks: {
      'astro:build:done': async (/** @type {{ dir: URL }} */ { dir }) => {
        const dist = fileURLToPath(dir);
        const urls = [];
        const walk = (abs) => {
          for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
            const full = path.join(abs, entry.name);
            if (entry.isDirectory()) {
              walk(full);
            } else {
              const rel = '/' + path.relative(dist, full).split(path.sep).join('/');
              if (rel === '/sw.js') continue;
              // pages precache under their clean URL; assets as-is
              urls.push(rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel);
            }
          }
        };
        walk(dist);
        urls.sort();
        const manifest = JSON.stringify(urls);
        const hash = crypto.createHash('sha256').update(manifest).digest('hex').slice(0, 12);
        const template = fs.readFileSync(new URL('./src/sw-template.js', import.meta.url), 'utf8');
        fs.writeFileSync(
          path.join(dist, 'sw.js'),
          template.replace('__CACHE_NAME__', `whq-${hash}`).replace('__PRECACHE_MANIFEST__', manifest)
        );
        console.log(`wrestling-hq-sw: precaching ${urls.length} URLs (cache whq-${hash})`);
      },
    },
  };
}

// Static output, zero client framework. The only JS on the site is small
// hand-written scripts (calendar drawer, library filters, service worker
// registration) — gym wifi is the constraint that decides this.
export default defineConfig({
  output: 'static',
  trailingSlash: 'ignore',
  markdown: {
    remarkPlugins: [remarkWikilinks],
  },
  integrations: [serviceWorker()],
});
