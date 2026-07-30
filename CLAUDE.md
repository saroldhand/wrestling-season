# Wrestling HQ — agent conventions

Season-planning system for a high school folkstyle program. The vault in
`content/` is the source of truth; the Astro site renders it. You will mostly
make small, reviewable edits to markdown files across a five-month season.
These rules keep those edits consistent.

## The rules

1. **The filename is the id.** `content/moves/bottom-standup.md` has
   `id: bottom-standup`, and `[[bottom-standup]]` resolves in Obsidian and on
   the site. Never rename a move file without updating every reference to it
   (frontmatter refs *and* body wikilinks) — grep for the old id across all of
   `content/` before you touch it.

2. **The schema is authoritative.** `src/lib/schemas.ts` (surfaced through
   `src/content.config.ts`) defines every legal frontmatter field and enum
   member. Don't invent values — if a technique doesn't fit an existing
   `category`, propose a schema change rather than freetexting the field.
   Schemas are `.strict()`: unknown keys fail validation on purpose.

3. **Delivered practices are the season record.** Never edit the frontmatter
   of a `content/practices/*.md` file whose `status` is `delivered` unless
   explicitly asked. After-practice notes go in the body under
   `## After-practice notes` — the body of a delivered practice may grow, its
   plan may not be rewritten.

4. **New ideas go to `status: backlog`, never straight into a practice.**
   The pipeline is `backlog → scheduled → installed → maintenance` (and
   eventually `retired`). Putting a move on a practice's `primary` list is
   what moves it to `scheduled`; keep the move file's status in sync.

5. **Run `npm run validate` before declaring done.** It checks that every id
   referenced in `primary`, `spiral`, `film`, `prerequisites`, `chains_to`,
   and `countered_by` resolves to a real file; that every practice date falls
   inside the season; filename/id agreement; orphaned moves; priority-1
   moves still in backlog; broken wikilinks; and that nothing under
   `content/private/` is tracked. `--strict` promotes warnings to errors.
   `npm run build` must also pass — the build validates the same schemas.

6. **Vocabulary.** Use the program's own terms: pods are **blue / gold /
   white**; the blocks are **evaluate / install / volume / refine / peak**;
   positions are **neutral / top / bottom / scramble / edge**; day types are
   **install / volume / sharpen / competition / off**. Don't drift into
   generic sports-app language ("workout", "session", "athlete profile").

7. **Never commit anything from `content/private/`.** It is gitignored and
   holds anything that identifies athletes (names, weights, descent plans,
   injury notes, scouting). Nothing in it may be rendered by the site or
   referenced from public content. If sensitive data shows up anywhere else,
   flag it instead of committing.

8. **Video sources are pointers.** A `sources` entry is a label, provider,
   URL, timestamp, and notes. Never download, re-host, embed, or copy the
   content behind the URL — RUDIS / Ocean / Flo material is paywalled and
   copyrighted.

9. **Dates live in `src/lib/season.ts` and nowhere else.** Season bounds,
   block boundaries, week numbering, the weekly rhythm, holidays. If a page
   or script needs a date rule, import it.

## Orientation

- `content/` — the Obsidian vault: `moves/`, `practices/` (one file per date,
  filename is the ISO date), `blocks/`, `concepts/`, `private/` (gitignored),
  `_templates/` (Obsidian Templater scaffolds).
- `scripts/new-move.mjs`, `scripts/new-practice.mjs` — scaffold new files;
  prefer them over hand-writing frontmatter.
- `scripts/seed-calendar.mjs` — idempotent; fills missing practice stubs for
  the season, never overwrites an existing file.
- `scripts/validate.mjs` — the gate described in rule 5.
- Site pages are in `src/pages/`; shared date math in `src/lib/season.ts`;
  wikilink resolution in `src/lib/wikilinks.ts`.

## Working style

- Make the smallest edit that does the job; this repo is optimized for
  reviewable diffs.
- A practice file with `status: planned` and a past date is a visible flag on
  the site, not an error — filling it in (or marking the day lost) is a
  coaching decision, so surface it, don't silently "fix" it.
- Body headings on moves follow the convention: `## Coaching points`,
  `## Common errors`, `## Drill progressions`, `## Situational entries`.
- Wikilinks `[[like-this]]` everywhere; never relative markdown paths.
  Tags are for cross-cutting themes only, never for values already in
  frontmatter.
