/**
 * The scripts' view of content/competitions/: which dates a meet replaces
 * practice. Same schema and rule the site uses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { competitionSchema } from '../../src/lib/schemas.ts';
import { meetDates } from '../../src/lib/competitions.ts';

const DIR = path.resolve(import.meta.dirname, '..', '..', 'content', 'competitions');

export function loadMeets() {
  if (!fs.existsSync(DIR)) return new Set();
  const competitions = [];
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(path.join(DIR, file), 'utf8'));
    const parsed = match && competitionSchema.safeParse(loadYaml(match[1]));
    // a broken file is the validator's to report; skip it here
    if (parsed?.success) competitions.push(parsed.data);
  }
  return meetDates(competitions);
}
