# Wrestling HQ

Season-planning system for a high school folkstyle program, 2026–27.

An Obsidian vault (`content/`) is the writing surface and source of truth; an
Astro static site renders it as a clickable Nov–March calendar, a searchable
move library, a system board, and printable practice cards. There is no
server and no database — everything is markdown files with validated
frontmatter, versioned in git.

## Quick start

```sh
npm install
npm run validate     # the content gate — run before every commit
npm run dev          # http://localhost:4321
npm run build        # static site → dist/
```

Open **`content/`** (not the repo root) as the Obsidian vault.

## Layout

| Path | What it is |
|---|---|
| `content/moves/` | One file per technique. Filename is the id. |
| `content/practices/` | One file per practice date. Filename is the ISO date. |
| `content/blocks/` | The five macrocycle blocks: evaluate, install, volume, refine, peak. |
| `content/concepts/` | Rules, principles, drills, protocols. |
| `content/private/` | **Gitignored.** Anything that identifies athletes. Never rendered. |
| `content/_templates/` | Obsidian Templater scaffolds. |
| `src/lib/season.ts` | The only place season dates live. |
| `src/lib/schemas.ts` | The only place legal frontmatter is defined. |
| `scripts/` | `validate`, `seed-calendar`, `new-move`, `new-practice`. |

## Scripts

```sh
npm run validate            # schema + referential integrity + season rules
npm run validate:strict     # warnings fail too (CI uses this posture eventually)
npm run seed                # fill missing practice stubs for the season (idempotent)
npm run new:move            # scaffold a move   (prompts, or flags: --id --name --position ...)
npm run new:practice        # scaffold a practice (prompts, or flags: --date ...)
```

## The content pipeline

Moves flow `backlog → scheduled → installed → maintenance` (→ `retired`).
`backlog` is the idea pile; putting a move on a practice makes it
`scheduled`; once the team has it, it's `installed`; `maintenance` means it
lives in the spiral rotation. The `/system` page shows every `priority: 1`
move — if that page doesn't fit on one screen, the system is too big.

Practices flow `planned → delivered`. After practice, mark the file
`delivered` and write what actually happened under `## After-practice notes`.
Delivered practices are the season record — the site flags any `planned`
file whose date has passed.

## Privacy and licensing (non-negotiable)

- **Video** (`sources` frontmatter) is a pointer list: label, provider, URL,
  timestamp, notes. Never download, re-host, or embed paywalled material
  from FloWrestling, RUDIS, or Ocean.
- **Athletes are minors.** Names, weights, descent plans, injury notes, and
  scouting live only in `content/private/`, which is gitignored and never
  rendered. Do not put roster data on a publicly reachable URL. A
  client-side password check is not authentication.

## Hosting

A GitHub Pages site is publicly reachable **even when the repo is private**
— repo visibility and site visibility are separate settings.

The recommended path: run locally through the early phases, then deploy to
**Cloudflare Pages with Cloudflare Access** in front (private repo, private
site, email-allowlist for the staff, free tier — verify current seat limits).
If you use GitHub Pages instead, treat the whole site as public and keep it
to techniques and practice structure only.

CI (`.github/workflows/ci.yml`) validates and builds on every push. See that
file for wiring up your chosen host.

## Obsidian setup

Vault root `content/`. Shared plugin config is committed under
`content/.obsidian/` (per-device `workspace.json` is ignored). Recommended
plugins: **Templater** (templates in `_templates/`), **Dataview**, and
**Obsidian Git** (auto-pull on open, auto-commit on a timer) so staff iPads
stay current without anyone learning git.

Conventions: wikilinks `[[bottom-standup]]` everywhere, never relative
paths; tags only for cross-cutting themes; after-practice notes in the
practice file body, not a separate daily note.

## For the agent

`CLAUDE.md` carries the working conventions. The short version: filename is
the id, the schema is authoritative, delivered practices are immutable
history, new ideas start in backlog, and `npm run validate` gates everything.
