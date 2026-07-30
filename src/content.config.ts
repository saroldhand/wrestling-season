import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { moveSchema, practiceSchema, blockSchema, conceptSchema } from './lib/schemas.ts';

// The vault root is `content/` at the repo root (it doubles as the Obsidian
// vault). `content/private/` and `content/_templates/` are deliberately not
// collections: private is gitignored and never rendered, templates are
// Obsidian scaffolds.
export const collections = {
  moves: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/moves' }),
    schema: moveSchema,
  }),
  practices: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/practices' }),
    schema: practiceSchema,
  }),
  blocks: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/blocks' }),
    schema: blockSchema,
  }),
  concepts: defineCollection({
    loader: glob({ pattern: '*.md', base: './content/concepts' }),
    schema: conceptSchema,
  }),
};
