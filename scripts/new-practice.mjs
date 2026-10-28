#!/usr/bin/env node
/**
 * Scaffold a practice file for a date, with block/week/day_type defaults
 * derived from src/lib/season.ts:
 *
 *   npm run new:practice -- --date 2026-12-03 [--day-type sharpen] [--duration 90]
 *
 * day_type defaults from the weekly rhythm and the meets in
 * content/competitions/; duration from the day type.
 *
 * Refuses to overwrite an existing file — practices are the season record.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import readline from 'node:readline/promises';
import { DAY_TYPES } from '../src/lib/schemas.ts';
import {
  isInSeason,
  blockFor,
  weekOf,
  defaultDayType,
  weekdayOf,
  DEFAULT_DURATION,
  SEASON_START,
  SEASON_END,
} from '../src/lib/season.ts';
import { loadMeets } from './lib/meets.mjs';

const DIR = path.resolve(import.meta.dirname, '..', 'content', 'practices');

const { values: args } = parseArgs({
  options: {
    date: { type: 'string' },
    'day-type': { type: 'string' },
    duration: { type: 'string' },
  },
});

let date = args.date;
if (!date) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  date = (await rl.question('date (YYYY-MM-DD): ')).trim();
  rl.close();
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`✗ "${date}" is not an ISO date (YYYY-MM-DD)`);
  process.exit(1);
}
if (!isInSeason(date)) {
  console.error(`✗ ${date} is outside the season (${SEASON_START} → ${SEASON_END})`);
  process.exit(1);
}

const file = path.join(DIR, `${date}.md`);
if (fs.existsSync(file)) {
  console.error(`✗ content/practices/${date}.md already exists — edit it instead`);
  process.exit(1);
}

const dayType = args['day-type'] ?? defaultDayType(date, loadMeets()) ?? 'install';
if (!DAY_TYPES.includes(dayType)) {
  console.error(`✗ day-type "${dayType}" must be one of: ${DAY_TYPES.join(' | ')}`);
  process.exit(1);
}
if (weekdayOf(date) === 0) {
  console.log(`note: ${date} is a Sunday — creating anyway (makeup practice?)`);
}

fs.writeFileSync(
  file,
  `---
date: ${date}
day_type: ${dayType}
block: ${blockFor(date)}
week: ${weekOf(date)}
duration_min: ${Number(args.duration ?? DEFAULT_DURATION[dayType])}
primary: []
spiral: []
schedule: []
pod_notes: {}
status: planned
---

## After-practice notes
`
);

console.log(`✓ content/practices/${date}.md created (${dayType}, block ${blockFor(date)}, week ${weekOf(date)})`);
console.log('  next: npm run validate');
