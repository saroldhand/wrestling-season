---
id: pod-system
name: The pod system
type: principle
tags: [practice-structure]
---

Practice groups are pods, split by development stage rather than weight:

- **Blue** — newer wrestlers building base positions. Coach-partnered
  drilling, handicapped live situations, high rep counts at low resistance.
- **Gold** — the varsity core. Full-speed drilling, live wrestling every
  session, film assignments.
- **White** — first-year wrestlers. Position and base before anything
  chain-linked; no live from specialty positions until the fundamentals hold.

Every practice file carries `pod_notes` — the same schedule, three different
jobs. A move's `pods` field says which groups it is taught to at all, and a
source's `audience` says who a film clip is for.

Pod rosters (which kid is in which pod) are private data and live only in
`content/private/` — never in this file.
