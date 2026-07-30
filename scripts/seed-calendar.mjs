#!/usr/bin/env node
/**
 * Fill the season with practice stubs: one file per date from SEASON_START
 * through SEASON_END, skipping Sundays, with block/week/day_type derived
 * from src/lib/season.ts. Holidays become day_type: off.
 *
 * Idempotent — an existing file is NEVER overwritten, so it is always safe
 * to re-run (e.g. after widening the season or adding a holiday).
 */
import fs from 'node:fs';
import path from 'node:path';
import { seasonDays, defaultDayType, blockFor, weekOf, HOLIDAYS } from '../src/lib/season.ts';

const DIR = path.resolve(import.meta.dirname, '..', 'content', 'practices');
fs.mkdirSync(DIR, { recursive: true });

let created = 0;
let kept = 0;

for (const iso of seasonDays()) {
  const dayType = defaultDayType(iso);
  if (!dayType) continue; // Sunday — no practice file

  const file = path.join(DIR, `${iso}.md`);
  if (fs.existsSync(file)) {
    kept++;
    continue;
  }

  const off = dayType === 'off';
  const body = off ? `${HOLIDAYS[iso]} — no practice.` : '## After-practice notes';
  fs.writeFileSync(
    file,
    [
      '---',
      `date: ${iso}`,
      `day_type: ${dayType}`,
      `block: ${blockFor(iso)}`,
      `week: ${weekOf(iso)}`,
      `duration_min: ${off ? 0 : 120}`,
      'primary: []',
      'spiral: []',
      'schedule: []',
      'pod_notes: {}',
      'status: planned',
      '---',
      '',
      body,
      '',
    ].join('\n')
  );
  created++;
}

console.log(`seed-calendar: ${created} stub(s) created, ${kept} existing file(s) left untouched`);
