# Rehearse

Rehearse is a voice mock-interview coach with browser speech, text mode and structured rubric feedback. The public **demo** uses pre-written examples and makes no AI calls. The self-hosted **full** edition uses your OpenAI key and stores sessions and answers in local SQLite. Audio is never recorded or stored by Rehearse.

## Run it yourself

Install Docker with Compose, then:

```sh
git clone https://github.com/firatkill/rehearse.git
cd rehearse
cp .env.full.example .env
```

Edit `.env`: add your OpenAI key and generate **two separate secrets**, each with `openssl rand -hex 32`, for `SESSION_SECRET` and `IP_HASH_SECRET`. Model and price settings are included; keep prices aligned with your provider account.

```sh
docker compose up --build
```

Open <http://localhost:3000>. Compose publishes only `127.0.0.1:3000`. Before exposing the app beyond your machine, set `APP_PASSWORD` and use HTTPS; the Basic Auth username is `rehearse`. Authentication covers pages, APIs, static assets and health checks. The container runs as a non-root user.

Sessions and answers survive restarts in the `rehearse-data` named volume (`/data/rehearse.sqlite`). Stop with `docker compose down`; this retains the volume. Back up the volume while the container is stopped, or export sessions through History. Keep the volume when upgrading. Deleting session data does not erase anonymous monthly cost totals.

The full edition has no daily IP quotas. Monthly spend warnings appear at 80% and 100% of `MONTHLY_BUDGET_USD` and never block practice. Totals use locally recorded successful feedback and summary costs; provider billing remains authoritative for failed requests and other usage.

## Local development

Use Node 22+ and the pinned pnpm version. Copy `.env.full.example` to `.env.local` **only if that file does not already exist**, then fill in the key and secrets as above.

```sh
pnpm install --frozen-lockfile
pnpm dev --hostname 127.0.0.1
```

Without a key, use `pnpm dev:mock --hostname 127.0.0.1` for free development with mock feedback. Full production rejects mock mode. Local SQLite lives in `.data/`; `DATA_DIR` overrides the directory.

For the demo, no provider key or Upstash is needed:

```sh
APP_EDITION=demo pnpm dev --hostname 127.0.0.1
```

Demo sessions stay in IndexedDB. Feedback is labelled “Sample feedback”; example jobs and answers are fictional. Owner live generation is still in progress for V4; pending files are explicitly marked. `pnpm demo:validate` checks the corpus. Only the owner runs `pnpm demo:generate --budget <approved-USD-cap>` in full/live mode, then `pnpm demo:validate --require-live` and reviews the output. The local generation cache is ignored by git; validated results are reused on resume.

## Checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Build full with valid live configuration; builds make no provider calls. Tests use mock providers and speech. Check ports 3200–3203 are free before E2E, or select four free consecutive ports with `E2E_BASE_PORT=3240`. Demo tests use `APP_EDITION=demo pnpm build` followed by `pnpm exec playwright test -c playwright.demo.config.ts`.

The Docker CI smoke test builds locally, starts a disposable Compose project with inert provider placeholders and no AI requests, checks authentication and SQLite restart persistence, and removes only its own test volume. It never publishes an image or makes paid calls:

```sh
docker build -t rehearse-v4-test .
node scripts/docker-smoke.mjs rehearse-v4-test
```

Implementation and owner review checkpoints: [V2 progress](docs/PROGRESS-V2.md). MIT, copyright Fırat Kıl.
