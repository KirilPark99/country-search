# Country Atlas

Live country search for the RS School [Country Search task](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md).

## Run locally

Use a current Node.js 22 release or newer.

```bash
npm ci
npm run build
python3 -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. Serve `dist`, not the source directory: the build compiles TypeScript into browser ES modules and copies the HTML and CSS there. No application bundler or API proxy is used.

## Commands

```bash
npm test
npm run lint
npx prettier --check .
npm run format
npm run build
```

All unit tests run in Node with mocked fetch and fake timers where needed. They do not call the real country API.

- Pre-commit: lint-staged checks staged TypeScript/JavaScript with ESLint and Prettier, and other supported text files with Prettier. It does not run tests or rewrite files.
- Pre-push: `npm test` blocks a push with failing tests.

## Features

- Search after a 300 ms pause in typing.
- Real cancellation immediately on every input change, including clearing.
- A 10-second timeout, separate from intentional cancellation.
- Distinct loading, results, no-results, and retryable-error states.
- Country cards and a keyboard-accessible native detail dialog.
- Session cache and shared in-flight requests with independent caller cancellation.
- Five recent searches saved in localStorage; selecting one searches immediately.

The API is `https://countries.dev/name/{query}`. HTTP 404 means no results; other unsuccessful statuses are HTTP errors. The interface also handles connection failures and timeouts.

## Project structure

- `src/debounce.ts`: delayed calls and queued-call cancellation.
- `src/countries.ts`: fetch, HTTP checks, and timeout composition.
- `src/map-country.ts`: pure API-to-view-model mapping.
- `src/errors.ts`: user-facing error classification.
- `src/search-controller.ts`: DOM-independent search state and cancellation.
- `src/country-client.ts`: cache, deduplication, and subscriber cancellation.
- `src/history.ts`: history normalization and storage.
- `src/ui.ts`, `src/app.ts`: DOM creation, rendering, and event wiring.
- `tests/`: isolated unit and integration tests.

See [DESIGN.md](./DESIGN.md) for cancellation, complexity, and design decisions.

## TDD history

| Topic                                   | Failing tests | Passing implementation |
| --------------------------------------- | ------------- | ---------------------- |
| Debounce                                | `d3c1938`     | `53f12d6`              |
| Country requests and HttpError          | `5914d06`     | `c70255d`              |
| Country mapping                         | `9a475df`     | `1677f20`              |
| Error distinction and search controller | `c7c2fac`     | `2aa0cc8`              |
| Cache and independent cancellation      | `24b02b9`     | `6ad5303`              |
| Search history                          | `23adadf`     | `c55e317`              |

The separate signal-aware race test is in commit `0a9849b`, after the mandatory base logic.

## Deployment and submission

Keep the personal repository private and work in `country-search`; do not merge application files into `main` before review.

For a static host, use `npm ci && npm run build` as the build command and `dist` as the publish directory. Deployment must serve the built ES modules over HTTP(S), not `file://`.

Before submission, repeat the task's behavior checklist on the public deployment, including throttled and offline requests in DevTools. Open the PR from `country-search` into your own `main`, include the deployment, screenshot, TDD history, and DESIGN.md link, and leave the PR open and unmerged.
