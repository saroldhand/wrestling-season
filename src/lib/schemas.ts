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
import { SEASON_START, SEASON_END, isInSeason, dateRange } from './season.ts';

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
// drill / situation / live / conditioning are the idea bank the practice page
// offers inside the matching schedule segment
export const CONCEPT_TYPES = ['rule', 'principle', 'protocol', 'drill', 'situation', 'live', 'conditioning'] as const;
/** What each stretch of a practice is. Warm-up + matball open every day; water and close are the talking time. */
export const SEGMENT_KINDS = [
  'warm-up',
  'matball',
  'teach',
  'drill',
  'situations',
  'live',
  'conditioning',
  'water',
  'close',
] as const;
export const TEAMS = ['varsity', 'jv'] as const;

/**
 * Named system-board sections that cut across positions. A move with `board`
 * set appears in that /system column instead of its position column. New
 * sections are a schema change on purpose — the board is the system, and
 * the system grows deliberately.
 */
export const BOARD_GROUPS = ['baseline-defense'] as const;

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
    board: z.enum(BOARD_GROUPS).optional(),
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
    start: z.string().regex(/^\d+:\d{2}$/, 'start is elapsed time from the 5:00 whistle, like "0:30"'),
    len: z.number().int().positive(),
    label: z.string().min(1),
    detail: z.string().optional(),
    kind: z.enum(SEGMENT_KINDS).optional(),
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

/** One stretch of a block's practice template; minutes run back to back from 5:00. */
export const templateSegmentSchema = z
  .object({
    kind: z.enum(SEGMENT_KINDS),
    min: z.number().int().positive(),
    note: z.string().optional(),
  })
  .strict();

export const blockSchema = z
  .object({
    id: z.enum(BLOCK_IDS),
    name: z.string().min(1),
    start: flexibleDate,
    end: flexibleDate,
    objective: z.string().min(1),
    kpis: z.array(z.string()).default([]),
    // how this phase spends a practice, by day type — the card's default
    // schedule until a practice's own schedule is written
    template: z.record(z.enum(['install', 'volume', 'sharpen']), z.array(templateSegmentSchema)).default({}),
  })
  .strict();

export const conceptSchema = z
  .object({
    id: idString,
    name: z.string().min(1),
    type: z.enum(CONCEPT_TYPES),
    blocks: z.array(z.enum(BLOCK_IDS)).default([]), // phases an idea fits; empty = any
    tags: z.array(z.string()).default([]),
  })
  .strict();

/** Clock times as the schedule prints them. */
const clockTime = z
  .string()
  .regex(/^(1[0-2]|[1-9]):[0-5]\d(am|pm)$/, 'times look like "9:30am" or "5:30pm"');

/** One value for the whole event, or a list with one value per day of a multi-day event. */
const perDay = <T extends z.ZodTypeAny>(value: T) => z.union([value, z.array(value).min(2)]);

const seasonDate = flexibleDate.refine(isInSeason, {
  message: `competition dates must fall inside the season (${SEASON_START} → ${SEASON_END})`,
});

/**
 * One file per competition in content/competitions/, named `<date>-<slug>`.
 * A time left out renders as TBA. Events both teams attend are one file
 * with `teams: [varsity, jv]`; a start that differs by team is a map.
 */
export const competitionSchema = z
  .object({
    name: z.string().min(1),
    date: seasonDate,
    end_date: seasonDate.optional(), // multi-day events only
    teams: z.array(z.enum(TEAMS)).min(1),
    location: z.string().min(1).optional(),
    home: z.boolean().default(false),
    start: z.union([perDay(clockTime), z.record(z.enum(TEAMS), clockTime)]).optional(),
    weigh_in: perDay(z.union([clockTime, z.enum(['none', 'home'])])).optional(), // home = weigh in at Turpin before the bus
    bus: perDay(z.union([clockTime, z.literal('none')])).optional(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (c.end_date && c.end_date <= c.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'end_date must be after date (leave it out for a one-day event)',
      });
    }
    const days = dateRange(c.date, c.end_date ?? c.date).length;
    for (const key of ['start', 'weigh_in', 'bus'] as const) {
      const value = c[key];
      if (Array.isArray(value) && value.length !== days) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} lists ${value.length} values for a ${days}-day event — give one per day, or a single value for every day`,
        });
      }
    }
    if (c.start && typeof c.start === 'object' && !Array.isArray(c.start)) {
      for (const team of Object.keys(c.start) as (typeof TEAMS)[number][]) {
        if (!c.teams.includes(team)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['start', team],
            message: `${team} has a start time but isn't in this competition's teams`,
          });
        }
      }
    }
  });

export type Move = z.infer<typeof moveSchema>;
export type Practice = z.infer<typeof practiceSchema>;
export type Block = z.infer<typeof blockSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type TemplateSegment = z.infer<typeof templateSegmentSchema>;
export type SegmentKind = (typeof SEGMENT_KINDS)[number];
export type Competition = z.infer<typeof competitionSchema>;
