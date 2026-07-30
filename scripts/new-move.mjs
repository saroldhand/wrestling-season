#!/usr/bin/env node
/**
 * Scaffold a new move file. Flags or interactive prompts:
 *
 *   npm run new:move -- --id neutral-ankle-pick --name "Ankle pick" \
 *     --position neutral --category entry [--tier secondary] [--priority 2]
 *
 * New moves always start at status: backlog (CLAUDE.md rule 4) — promote by
 * putting them on a practice, not by editing this default.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { POSITIONS, CATEGORIES, TIERS } from '../src/lib/schemas.ts';

const DIR = path.resolve(import.meta.dirname, '..', 'content', 'moves');

const { values: args } = parseArgs({
  options: {
    id: { type: 'string' },
    name: { type: 'string' },
    position: { type: 'string' },
    category: { type: 'string' },
    tier: { type: 'string', default: 'secondary' },
    priority: { type: 'string', default: '2' },
  },
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function need(key, valid) {
  let value = args[key];
  while (!value || (valid && !valid.includes(value))) {
    if (value) console.error(`  "${value}" is not one of: ${valid.join(' | ')}`);
    value = (await rl.question(`${key}${valid ? ` (${valid.join(' | ')})` : ''}: `)).trim();
  }
  return value;
}

const id = await need('id');
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
  console.error(`✗ id "${id}" must be kebab-case (lowercase letters, digits, single hyphens)`);
  process.exit(1);
}
const file = path.join(DIR, `${id}.md`);
if (fs.existsSync(file)) {
  console.error(`✗ content/moves/${id}.md already exists — filename is the id, pick another`);
  process.exit(1);
}

const name = await need('name');
const position = await need('position', [...POSITIONS]);
const category = await need('category', [...CATEGORIES]);
const tier = await need('tier', [...TIERS]);
const priority = Number(await need('priority', ['1', '2', '3']));
rl.close();

fs.writeFileSync(
  file,
  `---
id: ${id}
name: ${name.includes(':') ? JSON.stringify(name) : name}
position: ${position}
category: ${category}
tier: ${tier}
status: backlog
priority: ${priority}
pods: []
prerequisites: []
chains_to: []
countered_by: []
sources: []
tags: []
---

## Coaching points

## Common errors

## Drill progressions

## Situational entries
`
);

console.log(`✓ content/moves/${id}.md created (status: backlog — the pipeline starts there)`);
console.log('  next: npm run validate');
