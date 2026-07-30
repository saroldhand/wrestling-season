/**
 * Base-path-aware URL builder. The site lives at the domain root in dev and
 * on Cloudflare, but under /<repo>/ on GitHub Pages — `BASE_PATH` at build
 * time (see astro.config.mjs) decides. Every internal href goes through
 * this so the same build logic works in both worlds.
 *
 * Works in .astro frontmatter and in client scripts (Vite inlines
 * import.meta.env.BASE_URL in both).
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${base}${path}`;
}
