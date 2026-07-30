/**
 * Obsidian-style wikilinks for the built site.
 *
 * `[[bottom-standup]]` and `[[bottom-standup|the stand-up]]` resolve to the
 * right page for whichever collection owns the id:
 *   moves/<id>      → /moves/<id>
 *   concepts/<id>   → /concepts/<id>
 *   practices/<date>→ /practice/<date>
 *   blocks/<id>     → /calendar#block-<id>
 *
 * Unknown targets render as a marked <span class="broken-wikilink"> instead
 * of a dead link — visible breakage, per the fail-loudly rule. The validator
 * reports them too.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Root, PhrasingContent } from 'mdast';
import { visit } from 'unist-util-visit';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content');

// Runs at config-load time, before Vite defines import.meta.env — read the
// same BASE_PATH variable astro.config.mjs uses for `base`.
const BASE = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');

const URL_BY_DIR: Record<string, (id: string) => string> = {
  moves: (id) => `${BASE}/moves/${id}/`,
  concepts: (id) => `${BASE}/concepts/${id}/`,
  practices: (id) => `${BASE}/practice/${id}/`,
  blocks: (id) => `${BASE}/calendar#block-${id}`,
};

let idMap: Map<string, string> | null = null;

export function buildIdMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const dir of Object.keys(URL_BY_DIR)) {
    const abs = path.join(CONTENT_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (!file.endsWith('.md')) continue;
      const id = file.slice(0, -3);
      map.set(id, URL_BY_DIR[dir](id));
    }
  }
  return map;
}

export function resolveWikilink(id: string): string | null {
  idMap ??= buildIdMap();
  return idMap.get(id) ?? null;
}

const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/** Remark plugin: turn [[id]] / [[id|label]] text into links. */
export function remarkWikilinks() {
  return (tree: Root) => {
    idMap ??= buildIdMap();
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined) return;
      const value = node.value;
      if (!value.includes('[[')) return;

      const parts: PhrasingContent[] = [];
      let last = 0;
      for (const match of value.matchAll(WIKILINK)) {
        const [full, target, label] = match;
        const start = match.index;
        if (start > last) parts.push({ type: 'text', value: value.slice(last, start) });
        const url = idMap!.get(target.trim());
        const text = (label ?? target).trim();
        if (url) {
          parts.push({
            type: 'link',
            url,
            children: [{ type: 'text', value: text }],
            data: { hProperties: { className: ['wikilink'] } },
          });
        } else {
          parts.push({
            type: 'strong',
            children: [{ type: 'text', value: `[[${text}]]` }],
            data: { hName: 'span', hProperties: { className: ['broken-wikilink'], title: `No file named ${target.trim()}.md in content/` } },
          });
        }
        last = start + full.length;
      }
      if (parts.length === 0) return;
      if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
      parent.children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
