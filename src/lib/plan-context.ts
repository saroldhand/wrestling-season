/**
 * What a PracticeCard needs beyond the practice itself — each block's
 * templates and the idea bank — loaded once per page and passed down, so
 * the card stays a plain-data component.
 */
import { getCollection } from 'astro:content';
import type { Block, Concept } from './schemas.ts';

export interface Idea {
  id: string;
  name: string;
  blocks: Block['id'][];
}

export interface PlanContext {
  templates: Map<Block['id'], Block['template']>;
  ideas: Map<Concept['type'], Idea[]>;
}

export async function loadPlanContext(): Promise<PlanContext> {
  const blocks = await getCollection('blocks');
  const concepts = await getCollection('concepts');
  const ideas = new Map<Concept['type'], Idea[]>();
  for (const { data } of [...concepts].sort((a, b) => a.data.name.localeCompare(b.data.name))) {
    ideas.set(data.type, [...(ideas.get(data.type) ?? []), { id: data.id, name: data.name, blocks: data.blocks }]);
  }
  return { templates: new Map(blocks.map((b) => [b.data.id, b.data.template])), ideas };
}
