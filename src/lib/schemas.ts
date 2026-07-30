/**
 * Zod schemas for every content collection. This file is the single
 * authority on legal frontmatter (§8: don't invent enum members — propose a
 * schema change here instead).
 *
 * Imported by BOTH `src/content.config.ts` (so `astro build` rejects bad
 * frontmatter) and `scripts/validate.mjs` (so `npm run validate` catches it
 * without a full build). Node 22 runs the TypeScript directly.
 *
 * Every object schema is `.strict()` on purpose: a typo'd key fails loudly
 * instead of silently vanishing from the rendered site.
 */
import { z } from 'astro/zod';
import { SEASON_START, SEASON_END, isInSeason } from './season.ts';

export const POSITIONS = ['neutral', 'top', 'bottom', 'scramble', 'edge'] as const;
export const CATEGORIES = [
  'setup',
  'entry',
  'finish',
  'counter',
  'breakdown',
  'ride',
  'turn',
  'escape',
  'reversal',
] as const;
export const TIERS = ['core', 'secondary', 'situational'] as const;
export const MOVE_STATUSES = ['backlog', 'scheduled', 'installed', 'maintenance', 'retired'] as const;
export const PODS = ['blue', 'gold', 'white'] as const;
export const PROVIDERS = ['rudis', 'ocean', 'flo', 'usaw', 'youtube', 'facebook', 'other'] as const;
export const DAY_TYPES = ['install', 'volume', 'sharpen', 'competition', 'off'] as const;
export const BLOCK_IDS = ['evaluate', 'install', 'volume', 'refine', 'peak'] as const;
export const PRACTICE_STATUSES = ['planned', 'delivered'] as const;
export const CONCEPT_TYPES = ['rule', 'principle', 'drill', 'protocol'] as const;

/** Filename-is-the-id: kebab-case, no leading/trailing/double hyphens. */
export const idString = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ids are kebab-case: lowercase letters, digits, single hyphens');

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)');

/** YAML gives us a Date for unquoted dates and a string for quoted ones; accept both, keep ISO. */
const flexibleDate = z.union([z.date(), isoDateString]).transform((v) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v
);

export const sourceSchema = z
  .object({
    label: z.string().min(1),
    provider: z.enum(PROVIDERS),
    url: z.string().url('source url must be a full URL — this is a pointer list, never re-hosted media'),
    timestamp: z
      .string()
      .regex(/^\d+:\d{2}(?::\d{2})?$/, 'timestamp looks like "2:14" or "1:02:14"')
      .optional(),
    audience: z.array(z.enum(PODS)).optional(),
    notes: z.string().optional(),
  })
  .strict();

export const moveSchema = z
  .object({
    id: idString,
    name: z.string().min(1),
    position: z.enum(POSITIONS),
    category: z.enum(CATEGORIES),
    tier: z.enum(TIERS),
    status: z.enum(MOVE_STATUSES),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    pods: z.array(z.enum(PODS)).default([]),
    prerequisites: z.array(idString).default([]),
    chains_to: z.array(idString).default([]),
    countered_by: z.array(idString).default([]),
    first_taught: flexibleDate.optional(),
    sources: z.array(sourceSchema).default([]),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export const scheduleItemSchema = z
  .object({
    start: z.string().regex(/^\d+:\d{2}$/, 'start is elapsed time like "0:22"'),
    len: z.number().int().positive(),
    label: z.string().min(1),
    detail: z.string().optional(),
  })
  .strict();

export const practiceSchema = z
  .object({
    date: flexibleDate.refine(isInSeason, {
      message: `practice date must fall inside the season (${SEASON_START} → ${SEASON_END})`,
    }),
    day_type: z.enum(DAY_TYPES),
    block: z.enum(BLOCK_IDS),
    week: z.number().int().min(0).max(30),
    duration_min: z.number().int().min(0).max(480), // 0 is legal only for day_type: off

    primary: z.array(idString).default([]),
    spiral: z.array(idString).default([]),
    film: idString.optional(),
    schedule: z.array(scheduleItemSchema).default([]),
    pod_notes: z.record(z.enum(PODS), z.string()).default({}),
    status: z.enum(PRACTICE_STATUSES),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.duration_min === 0 && p.day_type !== 'off') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duration_min'],
        message: 'duration_min 0 is only legal on a day_type: off day',
      });
    }
  });

export const blockSchema = z
  .object({
    id: z.enum(BLOCK_IDS),
    name: z.string().min(1),
    start: flexibleDate,
    end: flexibleDate,
    objective: z.string().min(1),
    kpis: z.array(z.string()).default([]),
  })
  .strict();

export const conceptSchema = z
  .object({
    id: idString,
    name: z.string().min(1),
    type: z.enum(CONCEPT_TYPES),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type Move = z.infer<typeof moveSchema>;
export type Practice = z.infer<typeof practiceSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Concept = z.infer<typeof conceptSchema>;
