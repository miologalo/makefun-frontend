# make.fun frontend — makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/miologalo/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/miologalo/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, fully working frontend for [make.fun](https://make.fun): the live bounty
board, a bounty's page, its leaderboard, and an account's public profile — all
as static files reading only make.fun's public API, no sign-in, no build step.

## Surfaces

- `#/` — the bounty board: live pot, entry fee, time left, entries; search,
  sort by deadline / pot / entries / newest, filter by category, paginated,
  closed bounties on demand.
- `#/bounty/<slug>` — a bounty's page: summary, rewards table with the live
  pot, dates, status, description.
- `#/bounty/<slug>/leaderboard` — the bounty's leaderboard, paginated, columns
  from the API.
- `#/u/<handle>` — an account's public profile: record, links, entries.

## Performance

One request per view. Answers are cached in memory for 60 seconds and
revalidated with the API's minute-bound ETags (`If-None-Match` → 304), so a
revisit costs no fresh body. Board controls re-render only the list, never the
whole page. The first load is six small files — no framework, no third-party
code, system fonts only.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-frontend.ts` library.

## License

MIT — see [LICENSE](LICENSE).
