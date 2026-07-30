#!/usr/bin/env node
/**
 * The content gate. Run `npm run validate` before declaring any change done.
 *
 * Errors (exit 1):
 *   - frontmatter that fails the shared Zod schemas (same ones the build uses)
 *   - filename ≠ frontmatter id (moves, blocks, concepts)
 *   - practice filename ≠ its date field
 *   - any referenced move id (primary, spiral, film, prerequisites,
 *     chains_to, countered_by) that doesn't resolve to a real move file
 *   - practice dates outside the season
 *   - duplicate ids across the wikilink namespace (moves/concepts/blocks/practices)
 *   - anything at all inside content/private/ that is tracked by git
 *
 * Warnings (exit 0, or exit 1 with --strict):
 *   - priority-1 moves still in backlog
 *   - orphaned moves: status says scheduled/installed/maintenance but no
 *     practice references them
 *   - practice block/week fields that disagree with src/lib/season.ts
 *   - schedule blocks that overflow duration_min
 *   - broken [[wikilinks]] in markdown bodies
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { load as loadYaml } from 'js-yaml';
import { moveSchema, practiceSchema, blockSchema, conceptSchema } from '../src/lib/schemas.ts';
import { isInSeason, blockFor, weekOf, SEASON_START, SEASON_END } from '../src/lib/season.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const STRICT = process.argv.includes('--strict');

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });

function listMd(dir) {
  const abs = path.join(CONTENT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ rel: `content/${dir}/${f}`, abs: path.join(abs, f), slug: f.slice(0, -3) }));
}

function parseFile(file) {
  const raw = fs.readFileSync(file.abs, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    err(file.rel, 'no frontmatter block (file must start with ---)');
    return null;
  }
  try {
    return { data: loadYaml(match[1]) ?? {}, body: match[2] };
  } catch (e) {
    err(file.rel, `YAML parse error: ${e.message.split('\n')[0]}`);
    return null;
  }
}

function validateSchema(file, schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const where = issue.path.length ? issue.path.join('.') : '(root)';
    err(file.rel, `${where}: ${issue.message}`);
  }
  return null;
}

// ---- load everything ---------------------------------------------------
const collections = {
  moves: { files: listMd('moves'), schema: moveSchema },
  practices: { files: listMd('practices'), schema: practiceSchema },
  blocks: { files: listMd('blocks'), schema: blockSchema },
  concepts: { files: listMd('concepts'), schema: conceptSchema },
};

const parsed = {}; // name -> [{file, data, body}]
for (const [name, { files, schema }] of Object.entries(collections)) {
  parsed[name] = [];
  for (const file of files) {
    const raw = parseFile(file);
    if (!raw) continue;
    const data = validateSchema(file, schema, raw.data);
    if (data) parsed[name].push({ file, data, body: raw.body });
  }
}

// ---- filename-is-the-id ------------------------------------------------
for (const name of ['moves', 'blocks', 'concepts']) {
  for (const { file, data } of parsed[name]) {
    if (data.id !== file.slug) {
      err(file.rel, `filename is the id: frontmatter id "${data.id}" ≠ filename "${file.slug}"`);
    }
  }
}
for (const { file, data } of parsed.practices) {
  if (data.date !== file.slug) {
    err(file.rel, `practice filename must be its ISO date: date "${data.date}" ≠ filename "${file.slug}"`);
  }
}

// ---- id namespace ------------------------------------------------------
const moveIds = new Set(parsed.moves.map((m) => m.data.id));
const allIds = new Map(); // id -> first file
for (const name of Object.keys(parsed)) {
  for (const { file } of parsed[name]) {
    if (allIds.has(file.slug)) {
      err(file.rel, `duplicate id "${file.slug}" — already used by ${allIds.get(file.slug)}; wikilinks would be ambiguous`);
    } else {
      allIds.set(file.slug, file.rel);
    }
  }
}

// ---- referential integrity --------------------------------------------
const checkMoveRefs = (file, field, ids) => {
  for (const id of ids) {
    if (!moveIds.has(id)) err(file.rel, `${field}: "${id}" does not resolve to a file in content/moves/`);
  }
};

for (const { file, data } of parsed.moves) {
  checkMoveRefs(file, 'prerequisites', data.prerequisites);
  checkMoveRefs(file, 'chains_to', data.chains_to);
  checkMoveRefs(file, 'countered_by', data.countered_by);
}

const referencedByPractice = new Set();
for (const { file, data } of parsed.practices) {
  checkMoveRefs(file, 'primary', data.primary);
  checkMoveRefs(file, 'spiral', data.spiral);
  if (data.film) checkMoveRefs(file, 'film', [data.film]);
  for (const id of [...data.primary, ...data.spiral, ...(data.film ? [data.film] : [])]) {
    referencedByPractice.add(id);
  }

  if (!isInSeason(data.date)) {
    err(file.rel, `date ${data.date} is outside the season (${SEASON_START} → ${SEASON_END})`);
  } else {
    const expectedBlock = blockFor(data.date);
    if (data.block !== expectedBlock) {
      warn(file.rel, `block "${data.block}" disagrees with season.ts (${data.date} falls in "${expectedBlock}")`);
    }
    const expectedWeek = weekOf(data.date);
    if (data.week !== expectedWeek) {
      warn(file.rel, `week ${data.week} disagrees with season.ts (expected ${expectedWeek})`);
    }
  }

  const scheduled = data.schedule.reduce((sum, item) => sum + item.len, 0);
  if (scheduled > data.duration_min) {
    warn(file.rel, `schedule blocks total ${scheduled} min but duration_min is ${data.duration_min}`);
  }
}

// ---- pipeline hygiene --------------------------------------------------
for (const { file, data } of parsed.moves) {
  if (data.priority === 1 && data.status === 'backlog') {
    warn(file.rel, `priority-1 move still in backlog — schedule it or demote it`);
  }
  if (['scheduled', 'installed', 'maintenance'].includes(data.status) && !referencedByPractice.has(data.id)) {
    warn(file.rel, `orphaned: status "${data.status}" but no practice references it`);
  }
}

// ---- wikilinks in bodies ----------------------------------------------
const WIKILINK = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
for (const name of Object.keys(parsed)) {
  for (const { file, body } of parsed[name]) {
    for (const match of body.matchAll(WIKILINK)) {
      const target = match[1].trim();
      if (!allIds.has(target)) {
        warn(file.rel, `broken wikilink [[${target}]] — no file with that id`);
      }
    }
  }
}

// ---- nothing from private/ is tracked ---------------------------------
try {
  const tracked = execSync('git ls-files content/private', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((f) => f && !f.endsWith('.gitkeep'));
  for (const f of tracked) {
    err(f, 'content/private/ must never be committed — untrack this file (git rm --cached) and check history');
  }
} catch {
  // not a git repo (e.g. tarball checkout) — skip
}

// ---- report ------------------------------------------------------------
const counts = Object.entries(parsed)
  .map(([name, items]) => `${items.length} ${name}`)
  .join(', ');

for (const { file, msg } of errors) console.error(`  ERROR  ${file}: ${msg}`);
for (const { file, msg } of warnings) console.error(`  warn   ${file}: ${msg}`);

if (errors.length) {
  console.error(`\n✗ validate failed — ${errors.length} error(s), ${warnings.length} warning(s) (${counts})`);
  process.exit(1);
} else if (warnings.length && STRICT) {
  console.error(`\n✗ validate --strict — ${warnings.length} warning(s) treated as errors (${counts})`);
  process.exit(1);
} else {
  console.log(`✓ validate passed — ${counts}${warnings.length ? `, ${warnings.length} warning(s)` : ''}`);
}
