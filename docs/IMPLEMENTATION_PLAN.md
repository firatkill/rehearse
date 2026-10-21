# Rehearse: Implementation Plan

Ordered tasks to build Rehearse from an empty folder to a deployed v1.0.0. Read `AGENTS.md` first, then `docs/PRD.md` (what) and `docs/TRD.md` (how). This plan says in what order and how to know each step is done.

## How to use this plan

- Do tasks in ID order unless the "Depends on" line allows otherwise. One task is one branch and one pull request (or a short series of small commits on `main` before the first deploy, if working alone; see AGENTS.md).
- Each task lists the requirements it implements, the files it touches, steps, and acceptance criteria. A task is done only when every acceptance command passes and the Definition of Done in AGENTS.md holds.
- "TRD §n" means section n of `docs/TRD.md`; "PRD §n" means section n of `docs/PRD.md`. Test IDs (UT-, CT-, E2E-) are defined in TRD §25; eval metric IDs (EV-) in TRD §18.4; assumptions (A-) in TRD §26.
- Every acceptance list implicitly includes `pnpm lint && pnpm typecheck`, and from T-02 on also `pnpm test` (T-01 has no test runner yet). From T-04 on it also includes `pnpm build`; from T-17 on, `pnpm test:e2e` for the specs that exist.
- When a task verifies an assumption, record the result as a new row in the PRD decisions log (PRD §15) in the same pull request.
- Playwright runs: check first that no other Playwright run is using the same ports (3200–3203). In a fix-and-retest loop run only the affected specs (`pnpm test:e2e tests/e2e/<spec>`); run the full suite once at the end.

## Milestone overview

| Milestone                                | Tasks       | Exit criteria                                                                                                                                                                                                             |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0 Setup                                 | T-01 – T-05 | Tooling, env validation, CSP, test runners, CI, layout shell                                                                                                                                                              |
| M1 Question bank, setup, text-mode room  | T-06 – T-17 | A text-mode session runs end to end without feedback; E2E-02 (text parts), E2E-04, E2E-05 (without feedback, on the readonly server) and E2E-29 (session part) pass. E2E-01 needs the real landing page and lands in T-40 |
| M2 Voice                                 | T-18 – T-23 | Voice session works in Chrome by hand and in E2E with mocks; E2E-03, E2E-06 – E2E-10 pass                                                                                                                                 |
| M3 Feedback, rubric, report              | T-24 – T-31 | Live feedback works locally; E2E-05, E2E-11, E2E-19 – E2E-21 pass in mock mode (E2E-12 – E2E-15 are written in T-39)                                                                                                      |
| M4 Local storage, history, import/export | T-32 – T-35 | Reload recovery and history E2E pass; UT-12 – UT-15 pass                                                                                                                                                                  |
| M5 Eval and CI                           | T-36 – T-39 | `pnpm eval` passes thresholds; eval workflow green on a PR; full E2E suite green                                                                                                                                          |
| M6 Polish and deploy                     | T-40 – T-45 | Release checklist complete; v1.0.0 tagged                                                                                                                                                                                 |

---

## M0 Setup

### T-01 Scaffold the repository, tooling and CI skeleton

- **Goal**: An empty Next.js app with strict TypeScript, Tailwind v4, shadcn/ui, ESLint, Prettier, pnpm scripts and a CI workflow running lint, typecheck and build.
- **Implements**: D-01, NFR-17; A-09, A-19
- **Files**: `package.json`, `pnpm-lock.yaml`, `.nvmrc`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `postcss.config.mjs`, `components.json`, `.gitignore`, `LICENSE`, `app/layout.tsx`, `app/page.tsx` (placeholder H1), `app/globals.css`, `.github/workflows/ci.yml` (jobs `lint`, `typecheck`, `build` only; the `lint` job runs only install, `pnpm lint` and `pnpm audit` for now, TRD §27.1), `README.md` (one-paragraph stub).
- **Steps**:
  1. Do not run `git init` if the folder is already a repository. Create the app with the official create command for the installed Next.js major (App Router, TypeScript, Tailwind, ESLint, no `src/`, alias `@/*`) using pnpm.
  2. For every dependency in TRD §2, run `pnpm view <pkg> version` and pin the exact version. Set `"packageManager": "pnpm@<exact>"`, `"engines": { "node": ">=22" }`, `.nvmrc` = `22`.
  3. tsconfig options from TRD §2.
  4. ESLint flat config: `eslint-config-next`, `typescript-eslint` strict type-checked, `@typescript-eslint/no-explicit-any: error`, `@typescript-eslint/no-non-null-assertion: error` (off in `tests/`), `react/no-danger: error`, `no-console: error` (allowed in `scripts/`), `no-restricted-imports` for client folders per TRD §8 (patterns filled as modules appear).
  5. Prettier per TRD §3; run `pnpm format`.
  6. `pnpm dlx shadcn@latest init` with TRD §3 values; add the components listed in TRD §2.
  7. Add all scripts from TRD §3.1 (some target files created later; `lint`, `typecheck`, `build` must work now).
  8. Confirm the Next.js major, interception file name and CSP nonce guide (A-09); confirm shadcn with Tailwind v4 (A-19). Record both.
  9. Verify the `react-server` condition for scripts (TRD §3.1). Record the result.
  10. `ci.yml` with `lint`, `typecheck`, `build` jobs as in TRD §27.1, without the content-check steps whose scripts do not exist yet (`questions:validate` is added in T-06, `sample:validate` in T-31, `eval:validate` in T-36; `unit` and `e2e` jobs in T-04). Check action majors (A-16).
  11. `LICENSE`: MIT, "Copyright (c) 2026 Fırat Kıl".
  12. Owner (manual, GitHub): enable Dependabot alerts, secret scanning and push protection.
- **Acceptance**:
  - `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm build` exits 0.
  - `grep -E '"[\^~]' package.json` prints nothing.
  - `pnpm exec tsx --conditions=react-server -e "import('server-only').then(()=>console.log('ok'))"` prints `ok` (or the fallback is in place and recorded).
  - CI run on GitHub is green.
- **Depends on**: —

### T-02 Configuration, environment, errors and labels

- **Goal**: Typed constants, validated env, shared error codes, enum labels.
- **Implements**: TRD §4, §5, §20; FR-44 (env shape), FR-51 (mode flags)
- **Files**: `lib/config.ts`, `lib/env.ts`, `lib/errors.ts`, `lib/labels.ts`, `lib/time.ts`, `lib/version.ts`, `lib/hash.ts`, `.env.example`, `vitest.config.ts` (both projects declared, because `pnpm test` passes `--project unit --project component` and Vitest fails on a filter that matches no project; the `component` project has no tests until T-04, so set `passWithNoTests: true` until then), `tests/setup/unit.ts`, `tests/setup/empty.ts`, `tests/unit/env.test.ts` (UT-30).
- **Steps**:
  1. Copy `lib/config.ts` from TRD §4 verbatim.
  2. `lib/env.ts` per TRD §5: lazy memoized `getEnv()`, `resetEnvForTests()` exported for tests only.
  3. `lib/errors.ts`: `ERROR_CODES` and statuses from TRD §20, `AppError`, `httpStatus`.
  4. `lib/labels.ts`: label maps from PRD §9 (roles, seniorities, types, modes, dimensions).
  5. `lib/time.ts`: `utcDate(now)` → `YYYY-MM-DD`, `nextUtcMidnight(now)`, `formatMmSs(ms)`. `lib/hash.ts`: `sha256Hex`, `hmacSha256Hex`, `base64url` with `node:crypto` (server-only).
  6. `.env.example` with every variable; works unchanged for `pnpm dev:mock` (TRD §5).
  7. Vitest unit project; setup sets `LLM_MODE=mock`, `RATE_LIMIT_BACKEND=memory`, test secrets, the non-localhost fetch guard; alias `server-only` → `tests/setup/empty.ts`.
- **Acceptance**:
  - `pnpm test` runs UT-30 and passes, including "mock and memory forbidden in production", "secrets must differ", "message lists names, not values".
  - UT-30 asserts the variable names in `.env.example` equal the names in the TRD §5 table (fixture list) and that `getEnv()` succeeds with only `.env.example` values.
- **Depends on**: T-01

### T-03 Logging, request id and security headers

- **Goal**: Structured logs without sensitive data; CSP with a per-request nonce on request and response; security headers.
- **Implements**: FR-56, NFR-13, D-23; TRD §21, §22; A-09
- **Files**: `lib/logger.ts`, `lib/request.ts` (origin check, body reader with size limit, `jsonError(code, requestId, extra)`), `proxy.ts` (or `middleware.ts`), `app/layout.tsx` (nonce read), `tests/unit/request.test.ts`, `tests/unit/logger.test.ts`.
- **Steps**:
  1. Logger per TRD §22 with redaction paths.
  2. `proxy.ts` per TRD §21 item 4: nonce, request id, CSP on request and response, other headers, matcher.
  3. `lib/request.ts`: `readJsonBody(req, maxBytes)`, `checkOrigin(req, env)`, `jsonError`.
  4. Layout reads `x-nonce` via `headers()`; all pages dynamic.
- **Acceptance**:
  - `cp .env.example .env.local` (if not present), `pnpm build && pnpm start`, then `curl -sI http://localhost:3000 | grep -i -E 'content-security-policy|permissions-policy'` shows a nonce and `microphone=(self)`, and no `upgrade-insecure-requests` on `http:` (TRD §21); two requests show different nonces.
  - `request.test.ts`: oversize body → `BODY_TOO_LARGE`; bad origin → `ORIGIN_FORBIDDEN`; non-JSON content type → `UNSUPPORTED_MEDIA_TYPE`.
  - `logger.test.ts`: a log call with `transcript` and `token` fields prints `[Redacted]`.
- **Depends on**: T-02

### T-04 Test runners and full CI

- **Goal**: Vitest unit and component projects, coverage, Playwright with the two groups and four servers, speech-mock skeleton, all CI jobs.
- **Implements**: TRD §25 (setup), §27.1; A-16, A-23
- **Files**: `vitest.config.ts` (both projects, coverage thresholds from TRD §25.5; remove `passWithNoTests`), `tests/setup/component.ts`, `app/api/health/route.ts` (placeholder returning `{ "status": "ok" }`; full route in T-12), `playwright.config.ts` (TRD §25.4 verbatim), `tests/e2e/helpers.ts` (`uniqueIp`, `setHidden`), `tests/e2e/speech-mock.ts` (TRD §25.3 verbatim), `tests/e2e/smoke.spec.ts` (health returns 200 on all four ports), `.github/workflows/ci.yml` (all jobs).
- **Steps**:
  1. Configure both Vitest projects and coverage (thresholds start enforced; exclude files listed in TRD §25.5).
  2. Playwright config verbatim; check per-project `workers` and `page.clock` support (A-23); install Chromium.
  3. Commit the speech mock and helpers now so later tasks only add specs.
  4. Complete `ci.yml` per TRD §27.1 (`unit` runs `pnpm test:coverage` and `pnpm eval:mock`; until T-37 exists, `eval:mock` points to a stub script that exits 0 and prints "eval harness not yet implemented"; replace in T-37).
- **Acceptance**:
  - `pnpm test` runs both projects (a trivial component test renders `<p>ok</p>`).
  - `pnpm build && pnpm test:e2e tests/e2e/smoke.spec.ts` passes; `/api/health` placeholder route returns 200 (full route in T-12).
  - CI green with all five jobs.
- **Depends on**: T-03

### T-05 Design tokens, fonts, layout shell, theme and banners

- **Goal**: The editorial visual system, header, footer, skip link, theme toggle, banner slot, 404 and error pages.
- **Implements**: FR-53, NFR-08, NFR-09; PRD §9.1, §9.2, §9.13; TRD §19.2, §19.3
- **Files**: `app/globals.css`, `app/print.css` (empty `@media print` block for now), `app/layout.tsx`, `app/not-found.tsx`, `app/error.tsx`, `components/layout/*`, `components/common/live-region.tsx`, `hooks/use-announcer.ts`, `tests/component/announcer.test.tsx` (CT-06).
- **Steps**:
  1. Tokens verbatim from TRD §19.2; fonts with `next/font/google`.
  2. Theme script per TRD §19.3 (the single allowed `dangerouslySetInnerHTML`).
  3. Header, footer and skip link with the exact PRD §9.1 copy; room variant of the header (wordmark and "End session" slot).
  4. `Banners` component rendering the PRD §9.2 banners from props and client state (online, repository persistence, version change).
  5. `useAnnouncer` and `LiveRegion` per TRD §19.4 item 4.
  6. 404 and error boundary copy (PRD §9.13).
- **Acceptance**:
  - CT-06 passes.
  - `pnpm build && pnpm start`: `/` shows header, footer, skip link; toggling the theme persists across reload; `/does-not-exist` shows the 404 copy.
  - `grep -rn "dangerouslySetInnerHTML" app components | wc -l` prints `1`.
- **Depends on**: T-03

## M1 Question bank, setup, text-mode room

### T-06 Question schema, loader, validator and the 15 example questions

- **Goal**: The bank format, the 15 normative questions, and a validator that prints the coverage matrix.
- **Implements**: FR-01, FR-03; TRD §6.1–§6.5
- **Files**: `lib/questions/schema.ts`, `lib/questions/bank.ts`, `lib/questions/coverage.ts`, `content/questions/manifest.json`, `content/questions/behavioral.json`, `content/questions/technical-concepts.json`, `content/questions/system-design-lite.json`, `scripts/validate-questions.ts`, `tests/unit/bank.test.ts` (UT-03, coverage assertion skipped with `it.todo` until T-07), `tests/fixtures/bank-small.json`.
- **Steps**:
  1. Schema verbatim from TRD §6.2; `toSnapshot`.
  2. Commit the 15 questions from TRD §6.4 exactly, `bankVersion` `1.0.0`.
  3. Loader and rule checks 9–12; coverage matrix printer; rule 13 enforced from T-07 (the script accepts `--allow-incomplete` until then). Add the `pnpm questions:validate --allow-incomplete` step to the `lint` job in `ci.yml`; T-07 drops the flag.
  4. `bank-small.json`: 12 synthetic questions covering 2 roles × 3 types for selection tests.
- **Acceptance**:
  - `pnpm questions:validate --allow-incomplete` exits 0 and prints the matrix.
  - Adding a question with id `beh-001` twice, or a 46-word prompt, makes it exit 1 (UT-03 runs the checks on fixtures).
- **Depends on**: T-02

### T-07 Write the remaining 105 questions

- **Goal**: 120 active questions meeting every content rule and the coverage matrix.
- **Implements**: FR-02, FR-03; TRD §6.3
- **Files**: `content/questions/*.json`, `content/questions/manifest.json` (still `1.0.0`; the bank is unreleased), `.github/workflows/ci.yml` (drop `--allow-incomplete`), `tests/unit/bank.test.ts` (enable coverage assertion).
- **Steps**:
  1. Write questions in batches by type to the target distribution in TRD §6.3 (behavioral 50, technical concepts 40, system design lite 30). Write each prompt fresh; do not consult or paraphrase published question lists.
  2. After each batch run `pnpm questions:validate` and fill the weakest cells first.
  3. Review checklist per question (TRD §6.3 rules 1–8); note in the PR description that the checklist was applied.
- **Acceptance**:
  - `pnpm questions:validate` (without the flag) exits 0; every cell ≥ 5; 120 active questions; no topic used more than 4 times.
  - UT-03 passes with the coverage assertion enabled.
- **Depends on**: T-06

### T-08 Seeded PRNG and deterministic selection

- **Goal**: Reproducible question selection.
- **Implements**: FR-05, NFR-16, D-04; TRD §6.6
- **Files**: `lib/questions/prng.ts`, `lib/questions/select.ts`, `tests/unit/prng.test.ts` (UT-02), `tests/unit/select.test.ts` (UT-01).
- **Steps**: Implement TRD §6.6 verbatim; write the property tests; create and commit the snapshot on `bank-small.json`.
- **Acceptance**: UT-01 and UT-02 pass; coverage of `select.ts` and `prng.ts` ≥ 90% lines (`pnpm test:coverage`).
- **Depends on**: T-06 (the exhaustive cell test needs T-07; mark it `it.skipIf(!bankComplete)` until T-07 merges)

### T-09 Rate-limit adapter, visitor id and quotas

- **Goal**: Limiter interface with memory and Upstash implementations, daily visitor hashing, check order.
- **Implements**: FR-41, FR-42, FR-51, D-11 – D-14; TRD §13.2 – §13.6; A-06
- **Files**: `lib/ratelimit/types.ts`, `lib/ratelimit/memory.ts`, `lib/ratelimit/upstash.ts`, `lib/ratelimit/index.ts`, `lib/ratelimit/visitor.ts`, `lib/ratelimit/quotas.ts`, `tests/unit/limiter-contract.test.ts` (UT-10), `tests/unit/visitor.test.ts` (UT-09), `tests/unit/quotas.test.ts` (UT-11).
- **Steps**:
  1. Interface and error class.
  2. Memory implementation with injectable clock.
  3. Upstash implementation with injectable factories for `Ratelimit` and `Redis` so UT-10 can run against fakes; fail closed on `reason: 'timeout'` and errors.
  4. Read the installed `@upstash/ratelimit` source to confirm result fields and window alignment (A-06). Optionally confirm against a free database with a throwaway script (not committed with credentials). Record.
  5. `quotas.ts`: `checkStart`, `checkFeedback`, `checkSummary` per TRD §13.6 returning `{ ok: true, remaining } | { ok: false, code, resetAt }`.
- **Acceptance**: UT-09, UT-10, UT-11 pass; `lib/ratelimit/**` ≥ 90% lines.
- **Depends on**: T-02

### T-10 Session token

- **Goal**: HMAC-signed, scoped, expiring session tokens.
- **Implements**: FR-40, D-10; TRD §13.1
- **Files**: `lib/session/token.ts`, `tests/unit/token.test.ts` (UT-08).
- **Steps**: Implement TRD §13.1 including `r`, `s`, `b` and secret rotation.
- **Acceptance**: UT-08 passes; `token.ts` ≥ 90% lines.
- **Depends on**: T-02

### T-11 API contracts, client and `POST /api/sessions/start`

- **Goal**: Shared Zod contracts and the start endpoint.
- **Implements**: FR-40, FR-41 (sessions), FR-44, FR-46; TRD §12.1, §12.2, §12.6
- **Files**: `lib/api/contracts.ts`, `lib/api/client.ts`, `app/api/sessions/start/route.ts`, `tests/unit/contracts.test.ts` (UT-31), `tests/unit/api-start.test.ts` (UT-32).
- **Steps**:
  1. Contracts for all four routes (feedback and summary schemas reference placeholders until T-26/T-29; create `lib/feedback/schema.ts` with the TRD §15.1 and §15.2 schemas and `lib/summary/schema.ts` with the TRD §15.5 schemas now, because the record schemas in T-13 import `FeedbackSchema` and `SummarySchema`).
  2. Route per TRD §12.2 using `getBank`, `selectQuestions`, `newSeed`, `checkStart`, `signToken`.
  3. Client wrappers with the discriminated result type.
- **Acceptance**: UT-31, UT-32 pass; `curl -s -X POST localhost:3000/api/sessions/start -H 'content-type: application/json' -H 'origin: http://localhost:3000' -d '{"role":"backend","seniority":"mid","types":["behavioral"],"length":3,"mode":"text"}'` under `pnpm dev:mock` returns 3 questions and a token starting `rh1.`.
- **Depends on**: T-08, T-09, T-10

### T-12 `GET /api/health`

- **Goal**: Health endpoint used by Playwright and operations.
- **Implements**: FR-47; TRD §12.5
- **Files**: `app/api/health/route.ts`, `tests/unit/api-health.test.ts` (UT-35).
- **Acceptance**: UT-35 passes; the T-04 smoke spec passes against the real route.
- **Depends on**: T-02, T-06

### T-13 Record schemas, repository interface and memory repository

- **Goal**: Storage contract used by the room from M1; IndexedDB comes in T-32.
- **Implements**: FR-34 (shape), FR-39; TRD §7.3, §7.7
- **Files**: `lib/storage/schema.ts`, `lib/storage/repository.ts`, `lib/storage/memory-repository.ts`, `hooks/use-repository.ts` (returns the memory repository until T-32), `tests/unit/repository-contract.test.ts` (UT-13, memory only for now).
- **Acceptance**: UT-13 passes for the memory implementation.
- **Depends on**: T-06, T-11

### T-14 Setup page

- **Goal**: `/setup` with every field, default, state and copy, starting a session and storing it.
- **Implements**: FR-04, FR-05 (seed param), FR-46, PRD §9.4 (all states except voice-specific ones, which T-18 and T-20 complete)
- **Files**: `app/setup/page.tsx`, `components/setup/setup-form.tsx`, `components/setup/quota-panel.tsx`, `components/setup/capability-notice.tsx` (static "Checking…" until T-18), `tests/component/setup-form.test.tsx` (CT-01, partial).
- **Steps**:
  1. Server page passes `demoMode` and quota numbers.
  2. Form with fieldsets, defaults from `SETUP_DEFAULTS`, preferences in `localStorage['rehearse-setup']`.
  3. Submit → `startSession`; on 200 create the `SessionRecord` (TRD §7.3) and navigate; on 429/503 show the panels; "Practise without feedback" resubmits with `feedback: false` and stores reason `quota` or `limiter_unavailable`.
  4. `?seed=` handling and copy.
- **Acceptance**: CT-01 (non-voice cases) passes; E2E-02 text-mode parts and E2E-04 pass (`pnpm test:e2e tests/e2e/setup.spec.ts tests/e2e/setup-seed.spec.ts`).
- **Depends on**: T-05, T-11, T-13

### T-15 Room state machine

- **Goal**: The pure room reducer with every transition and the recovery mapping.
- **Implements**: FR-08 – FR-18 (logic), FR-35 (mapping); TRD §11.1, §11.4
- **Files**: `lib/room/machine.ts`, `tests/unit/room-machine.test.ts` (UT-18).
- **Steps**: Implement types and transitions from TRD §11.1 and the table in §11.4 as `resumePhase(session, answers)`.
- **Acceptance**: UT-18 passes; `lib/room/machine.ts` ≥ 90% lines.
- **Depends on**: T-13

### T-16 Words, fillers and the delivery block (text mode)

- **Goal**: Deterministic text metrics and their display.
- **Implements**: FR-24 (text parts), FR-25, FR-59 (Could: enabled list parameter only); TRD §16.1, §16.3
- **Files**: `lib/metrics/words.ts`, `lib/metrics/fillers.ts`, `lib/metrics/delivery.ts` (text branch), `lib/metrics/format.ts`, `components/room/delivery-metrics.tsx`, `tests/unit/words.test.ts` (UT-04), `tests/unit/fillers.test.ts` (UT-05), `tests/component/delivery-metrics.test.tsx` (CT-04).
- **Acceptance**: UT-04, UT-05, CT-04 pass; `lib/metrics/**` ≥ 90% lines.
- **Depends on**: T-02

### T-17 Text-mode interview room

- **Goal**: A complete text session without feedback: intro, question display, think timer, text answer, review, save, skip, end, completion.
- **Implements**: FR-08, FR-10, FR-12 – FR-14, FR-17, FR-18, FR-58 (Could); PRD §9.5, §9.6 (non-voice, non-feedback rows)
- **Files**: `app/session/[id]/page.tsx`, `components/room/room.tsx`, `progress-header.tsx`, `question-panel.tsx`, `think-timer.tsx`, `text-answer.tsx`, `review-panel.tsx`, `resume-card.tsx`, `components/common/confirm-dialog.tsx`, `components/common/timer-display.tsx`, `hooks/use-interview-room.ts`, `hooks/use-visibility.ts`, `hooks/use-online.ts`, `tests/component/review-panel.test.tsx` (CT-05), `tests/e2e/text-session.spec.ts` (E2E-05, first without feedback: the spec uses `baseURL` `http://localhost:3201` (readonly server), where setup starts sessions without feedback, so review shows "Save and continue" (D-42); T-28 switches it to port 3200 with feedback), `tests/e2e/not-found.spec.ts` (E2E-29, session part).
- **Steps**:
  1. Effects runner around `roomReducer`: timers (TRD §11.2), focus management (TRD §19.4 item 3), announcements, persistence writes (TRD §11.3) through the repository.
  2. Copy exactly as PRD §9.6.
  3. Report route placeholder that lists answers (full report in T-30).
  4. Read-aloud is not built yet: the room treats synthesis as unavailable and dispatches `TTS_DONE('skipped')` (goes straight to thinking). T-21 wires real TTS; until then E2E-05 does not assert spoken text.
  5. While the memory repository is in use (until T-32), the Not saving banner is expected on every room page; tests must not assert its absence before T-33.
- **Acceptance**: CT-05 passes; `pnpm test:e2e tests/e2e/text-session.spec.ts tests/e2e/not-found.spec.ts` passes; manual: a 3-question text session completes in Firefox.
- **Depends on**: T-14, T-15, T-16

## M2 Voice

### T-18 Capability detection, microphone check and setup capability states

- **Goal**: Feature detection, the setup notices, the microphone check, voice option enablement.
- **Implements**: FR-07, FR-54; TRD §9.1, §9.2
- **Files**: `lib/speech/types.ts`, `lib/speech/detect.ts`, `lib/speech/microphone.ts`, `hooks/use-capabilities.ts`, `components/setup/capability-notice.tsx`, `components/setup/mic-check.tsx`, `tests/unit/detect.test.ts` (UT-20), `tests/e2e/setup-capabilities.spec.ts` (E2E-03).
- **Acceptance**: UT-20, CT-01 (capability cases), E2E-03 pass.
- **Depends on**: T-14

### T-19 Recognizer adapter, transcript assembly and recorder machine

- **Goal**: Robust speech recognition with restarts and error mapping.
- **Implements**: FR-11, FR-15; TRD §9.3 – §9.6; A-13
- **Files**: `lib/speech/recognizer.ts`, `lib/speech/transcript.ts`, `lib/speech/recorder-machine.ts`, `lib/speech/errors.ts`, `hooks/use-recorder.ts`, `tests/unit/transcript.test.ts` (UT-17), `tests/unit/recorder-machine.test.ts` (UT-16).
- **Steps**: Implement the reducer table exactly; the hook owns recognizer instances, timers (`RESTART_DELAY_MS`, `STOP_GRACE_MS`), result-offset capture and cleanup on unmount. Check A-13 and record.
- **Acceptance**: UT-16, UT-17 pass; `recorder-machine.ts` and `transcript.ts` ≥ 90% lines.
- **Depends on**: T-18

### T-20 Speech synthesis, voices, captions and the voice picker

- **Goal**: Questions read aloud with captions; voice and rate selection with preview.
- **Implements**: FR-04 (voice fields), FR-06, FR-09, D-29; TRD §10 (including `primeSynthesis` called synchronously in the "Preview voice" click handler)
- **Files**: `lib/speech/voices.ts`, `lib/speech/chunk.ts`, `lib/speech/tts.ts`, `hooks/use-tts.ts`, `hooks/use-voices.ts`, `components/setup/voice-picker.tsx`, `components/room/captions.tsx`, `tests/unit/tts.test.ts` (UT-19), `tests/component/voice-picker.test.tsx` (CT-02).
- **Acceptance**: UT-19, CT-02 pass; E2E-02 voice parts ("Preview voice") pass.
- **Depends on**: T-18

### T-21 Voice room integration

- **Goal**: Asking with TTS, recording with live transcript, limits, tab-hidden and offline handling, "Type instead", every speech error state.
- **Implements**: FR-09, FR-11, FR-12, FR-15, FR-16, FR-55, D-28, D-29, D-36; PRD §9.6 voice rows; A-14, A-15, A-20, A-25
- **Files**: `components/room/recorder-panel.tsx`, `components/room/speech-error.tsx`, `hooks/use-interview-room.ts`, `components/room/*` (wiring).
- **Steps**:
  1. "Start the interview" and "Continue" click handlers call `primeSynthesis` synchronously, then the mic check (TRD §9.2, §10.3). Replace the T-17 `TTS_DONE('skipped')` stub with real TTS and add the "asking (TTS spoken)" assertion to E2E-05.
  2. TTS and recognition never overlap (TRD §10.3 rules).
  3. Time limit, char cap, visibility and offline stops (TRD §9.7, §11.2).
  4. Manual tests in Chrome, Edge and Safari for A-14, A-15, A-20 and A-25; record results and adjust `MAX_RESTARTS` if needed.
- **Acceptance**: A 3-question voice session completes by hand in desktop Chrome (note browser version in the PR); E2E-06 – E2E-10 pass (written in T-23, may land in the same PR).
- **Depends on**: T-17, T-19, T-20

### T-22 Voice delivery metrics

- **Goal**: Speaking time, pace and pauses from recognition timing.
- **Implements**: FR-24 (voice parts), D-17; TRD §16.2, §16.4; A-21
- **Files**: `lib/metrics/delivery.ts` (voice branch), `lib/metrics/pauses.ts`, `tests/unit/delivery.test.ts` (UT-06), `tests/unit/pauses.test.ts` (UT-07).
- **Acceptance**: UT-06, UT-07 pass; A-21 recorded.
- **Depends on**: T-16, T-19

### T-23 Voice E2E with the speech mock

- **Goal**: Every voice path covered in Playwright with mocked recognition and synthesis. Under D-58, M2 uses the readonly server and practice-only saving with the placeholder report; T-28/T-30 add feedback/full report assertions.
- **Implements**: Tests for FR-09 – FR-16; A-11 (first pass)
- **Files**: `tests/e2e/helpers.ts` (scenarios), `tests/e2e/voice-session.spec.ts` (E2E-06), `voice-limits.spec.ts` (E2E-07), `speech-errors.spec.ts` (E2E-08), `tab-hidden.spec.ts` (E2E-09), `type-instead.spec.ts` (E2E-10).
- **Steps**: Scenarios per TRD §25.3; use `page.clock` for timers. Record a first browser-support check (A-11) from MDN.
- **Acceptance**: `pnpm test:e2e tests/e2e/voice-session.spec.ts tests/e2e/voice-limits.spec.ts tests/e2e/speech-errors.spec.ts tests/e2e/tab-hidden.spec.ts tests/e2e/type-instead.spec.ts` passes twice in a row locally.
- **Depends on**: T-21, T-22

## M3 Feedback, rubric, report

### T-24 LLM provider (live and mock), model pinning and cost estimate

- **Goal**: Provider interface, OpenAI implementation via the AI SDK, deterministic mock, cost formula.
- **Implements**: FR-45, FR-51; TRD §14.0, §15.6, §23.1; A-01, A-02, A-03, A-10
- **Files**: `lib/llm/provider.ts`, `lib/llm/openai.ts`, `lib/llm/mock.ts`, `lib/llm/index.ts`, `lib/cost/estimate.ts`, `.env.example` (pinned `CHAT_MODEL` with comment), `tests/unit/mock-provider.test.ts` (UT-39), `tests/unit/cost.test.ts` (UT-29).
- **Steps**:
  1. Verify A-10 and write `openai.ts` for the installed AI SDK major (option A or B in TRD §14.0) with `strictJsonSchema: false` passed explicitly and `maxRetries: 0`. Record which option was used (D-38).
  2. Pick and pin the model (A-01), test `temperature` (A-02), copy prices (A-03). Record all three.
  3. Mock provider exactly per TRD §15.6.
- **Acceptance**: UT-29, UT-39 pass; a manual `pnpm exec tsx --conditions=react-server -e` call of `getProvider().generateStructured` with a toy schema in live mode returns an object (owner, once; not in CI).
- **Depends on**: T-02

### T-25 Rubric, prompts, sanitization and versioning

- **Goal**: The exact prompt texts and rubric as code.
- **Implements**: FR-19, FR-23; TRD §14.1 – §14.6
- **Files**: `lib/feedback/rubric.ts`, `lib/prompts/feedback.ts`, `lib/prompts/summary.ts`, `lib/prompts/sanitize.ts`, `lib/prompts/version.ts`, `tests/fixtures/prompts/*.txt` (byte-exact copies from the TRD), `tests/unit/sanitize.test.ts` (UT-21), `tests/unit/prompts.test.ts` (UT-22).
- **Acceptance**: UT-21, UT-22 pass (prompt texts equal the fixtures byte for byte).
- **Depends on**: T-02

### T-26 Feedback schemas, normalization, evidence and `generateFeedback`

- **Goal**: Validated, capped, evidence-checked feedback from one function shared by route, eval and sample generator.
- **Implements**: FR-19 – FR-23, D-08, D-09; TRD §15.1 – §15.4
- **Files**: `lib/feedback/schema.ts`, `lib/feedback/normalize.ts`, `lib/feedback/evidence.ts`, `lib/feedback/generate.ts`, `tests/unit/normalize.test.ts` (UT-23), `tests/unit/evidence.test.ts` (UT-24), `tests/unit/generate-feedback.test.ts` (UT-25).
- **Acceptance**: UT-23 – UT-25 pass; `lib/feedback/**` ≥ 90% lines.
- **Depends on**: T-24, T-25

### T-27 `POST /api/feedback`

- **Goal**: The feedback endpoint with token, scope, limits, LLM call and safe logging.
- **Implements**: FR-19, FR-40 – FR-45, FR-56; TRD §1.3, §12.3, §13.6
- **Files**: `app/api/feedback/route.ts`, `tests/unit/api-feedback.test.ts` (UT-33).
- **Steps**: Implement the check order (TRD §12.1); map errors per TRD §20; include `sessionCallsRemaining`; log `feedback.done`/`feedback.failed` without text. After it works live locally, measure token sizes from logs and update TRD §23.2 if they differ by more than 20%.
- **Acceptance**: UT-33 passes, including the "no transcript in logs" assertion; a live local call returns valid feedback (owner, once).
- **Depends on**: T-11, T-26

### T-28 Feedback UI: skeleton, card, errors and retries

- **Goal**: The submitting, feedback and every feedback-error state in the room.
- **Implements**: FR-20 – FR-22, FR-26, FR-27; PRD §9.6 (feedback rows), §9.7
- **Files**: `components/room/feedback-skeleton.tsx`, `components/room/feedback-card.tsx`, `components/room/feedback-error.tsx`, `components/common/safe-text.tsx`, `hooks/use-interview-room.ts`, `tests/component/feedback-card.test.tsx` (CT-03), `tests/component/safe-render.test.tsx` (CT-09, `SafeText` part), `tests/e2e/text-session.spec.ts` (E2E-05 with feedback, moved to port 3200), `tests/e2e/feedback-errors.spec.ts` (E2E-11).
- **Acceptance**: CT-03, CT-09 (SafeText), E2E-05, E2E-11 pass.
- **Depends on**: T-17, T-27

### T-29 Aggregates, summary generation and `POST /api/summary`

- **Goal**: Deterministic report numbers and one short LLM summary per session.
- **Implements**: FR-28, FR-29, FR-30 (focus logic), D-06, D-07; TRD §12.4, §14.5, §15.5, §17.1
- **Files**: `lib/report/aggregate.ts`, `lib/summary/schema.ts`, `lib/summary/generate.ts`, `app/api/summary/route.ts`, `tests/unit/aggregate.test.ts` (UT-27), `tests/unit/summary.test.ts` (UT-26), `tests/unit/api-summary.test.ts` (UT-34).
- **Acceptance**: UT-26, UT-27, UT-34 pass.
- **Depends on**: T-27

### T-30 Report page, chart, Markdown export and print

- **Goal**: `/session/[id]/report` with every section and state.
- **Implements**: FR-28 – FR-32; PRD §9.8; TRD §17.2 – §17.4
- **Files**: `app/session/[id]/report/page.tsx`, `components/report/*`, `hooks/use-report.ts`, `lib/report/markdown.ts`, `lib/report/chart.ts`, `app/print.css`, `tests/unit/markdown.test.ts` (UT-28), `tests/component/report-view.test.tsx` (CT-07), `tests/e2e/report.spec.ts` (E2E-19), `tests/e2e/summary-errors.spec.ts` (E2E-20).
- **Steps**: The report calls the summary once when `summaryStatus` is `none`, feedback was enabled, the token is valid and ≥ 1 answer is scored; stores the result on the session.
- **Acceptance**: UT-28, CT-07, E2E-19, E2E-20 pass.
- **Depends on**: T-28, T-29

### T-31 Sample session and `/sample`

- **Goal**: A real, precomputed sample report served with zero LLM calls.
- **Implements**: FR-33; TRD §17.5
- **Files**: `scripts/sample-transcripts.json`, `scripts/sample-generate.ts`, `scripts/validate-sample.ts`, `content/sample/session.json`, `app/sample/page.tsx`, `tests/unit/sample.test.ts` (UT-40), `tests/e2e/sample.spec.ts` (E2E-21).
- **Steps**:
  1. Write the three fictional transcripts (TRD §17.5).
  2. Until the owner runs the live generator, commit a mock-generated sample and add the `pnpm sample:validate --allow-mock` step to the `lint` job in `ci.yml`; the owner runs `pnpm sample:generate` live before T-45 and CI drops the flag.
- **Acceptance**: UT-40, E2E-21 pass; `pnpm sample:validate --allow-mock` exits 0.
- **Depends on**: T-30

## M4 Local storage, history, import and export

### T-32 IndexedDB wrapper, migrations and IndexedDB repository

- **Goal**: Durable browser storage with versioned schema.
- **Implements**: FR-34, D-20; TRD §7.1 – §7.4, §7.7; A-18
- **Files**: `lib/storage/idb.ts`, `lib/storage/migrations.ts`, `lib/storage/idb-repository.ts`, `hooks/use-repository.ts` (selection logic per TRD §7.1), `tests/unit/idb.test.ts` (UT-12), `tests/unit/repository-contract.test.ts` (UT-13, both implementations), `tests/unit/migrations-upgrade.test.ts` (UT-14).
- **Acceptance**: UT-12 – UT-14 pass with `fake-indexeddb`; `lib/storage/**` ≥ 90% lines; A-18 recorded.
- **Depends on**: T-13

### T-33 Persistence wiring and recovery after reload

- **Goal**: No answer lost on reload; resume at the right step; storage fallbacks and banners.
- **Implements**: FR-35, FR-39, NFR-14; TRD §7.6, §11.3, §11.4, §20 (client-only rows)
- **Files**: `hooks/use-interview-room.ts`, `components/room/resume-card.tsx`, `components/layout/banners.tsx`, `tests/e2e/recovery.spec.ts` (E2E-16), `tests/e2e/storage-unavailable.spec.ts` (E2E-23).
- **Acceptance**: E2E-16, E2E-23 pass; manual: reload during a voice recording in Chrome lands in review with the restored notice.
- **Depends on**: T-32, T-21, T-28

### T-34 History page and deletion

- **Goal**: `/history` with list, resume, open, delete and delete-all.
- **Implements**: FR-36, FR-38; PRD §9.9
- **Files**: `app/history/page.tsx`, `components/history/history-list.tsx`, `components/history/data-controls.tsx` (delete parts), `tests/component/history-list.test.tsx` (CT-08), `tests/e2e/history.spec.ts` (E2E-17).
- **Acceptance**: CT-08, E2E-17 pass.
- **Depends on**: T-33

### T-35 Export and import

- **Goal**: Move data between browsers without an account.
- **Implements**: FR-37; TRD §7.5
- **Files**: `lib/storage/export.ts`, `components/history/data-controls.tsx`, `tests/fixtures/export-v1.json`, `tests/unit/export-import.test.ts` (UT-15), `tests/e2e/export-import.spec.ts` (E2E-18).
- **Acceptance**: UT-15, E2E-18 pass.
- **Depends on**: T-34

## M5 Eval and CI

### T-36 Golden set

- **Goal**: 24 golden answers with expected ranges and a validator.
- **Implements**: FR-48; TRD §18.2, §18.3
- **Files**: `lib/eval/golden-schema.ts`, `eval/golden.jsonl`, `scripts/validate-golden.ts`, `tests/unit/golden-validate.test.ts` (UT-36).
- **Steps**: Commit the six items from TRD §18.3 verbatim; write the other 18 per the rules; add the `pnpm eval:validate` step to the `lint` job in `ci.yml`; run `pnpm eval:mock` to sanity-check the harness wiring once T-37 exists.
- **Acceptance**: `pnpm eval:validate` exits 0; UT-36 passes.
- **Depends on**: T-07

### T-37 Eval runner, metrics, thresholds and budget guard

- **Goal**: `pnpm eval` that gates feedback quality and cost.
- **Implements**: FR-49, D-21, D-22; TRD §18.1, §18.4 – §18.7
- **Files**: `lib/eval/metrics.ts`, `lib/eval/results-schema.ts`, `lib/eval/budget.ts`, `scripts/eval.ts`, `eval/thresholds.json`, `eval/results/<runId>.json`, `eval/results/latest.json`, `tests/unit/eval-metrics.test.ts` (UT-37), `tests/unit/budget.test.ts` (UT-38).
- **Steps**:
  1. Implement and unit-test metrics and the guard.
  2. Replace the T-04 `eval:mock` stub.
  3. Owner runs `pnpm eval` live locally; if a threshold fails, improve the prompt or rubric (bump `FEEDBACK_PROMPT_VERSION`) or fix golden ranges that are wrong (with a reason in `notes`), never lower thresholds. Commit the passing run and `latest.json`.
- **Acceptance**: UT-37, UT-38 pass; `pnpm eval:mock` exits 0 in CI; the committed results file has `"passed": true`.
- **Depends on**: T-26, T-36

### T-38 Eval workflow

- **Goal**: Paid eval runs only when relevant, with a budget.
- **Implements**: FR-50; TRD §27.2
- **Files**: `.github/workflows/eval.yml`.
- **Steps**: Commit the workflow verbatim; owner creates the `eval` environment, secret and variables (TRD §27.2); open a PR touching `lib/prompts/` (for example a comment) to see it run.
- **Acceptance**: The eval workflow is green on a PR; a PR touching only `README.md` does not trigger it; a PR from a fork skips the job.
- **Depends on**: T-37

### T-39 Complete the E2E suite

- **Goal**: Every PRD state and cross-cutting requirement covered.
- **Implements**: NFR-08, NFR-09, NFR-13, FR-40 – FR-44, FR-55; TRD §25.4
- **Files**: `tests/e2e/feedback-limits.spec.ts` (E2E-12), `isolated.spec.ts` (E2E-13), `readonly.spec.ts` (E2E-14), `demo-off.spec.ts` (E2E-15), `offline.spec.ts` (E2E-22), `keyboard.spec.ts` (E2E-24), `responsive.spec.ts` (E2E-25), `theme.spec.ts` (E2E-26), `security-headers.spec.ts` (E2E-27), `api-contracts.spec.ts` (E2E-28), `a11y.spec.ts` (E2E-30 for the pages and states that exist now: `/setup`, room states, report, `/history`, `/sample`; T-41 adds `/`, `/how-it-works` and `/privacy` after T-40 builds them). `landing.spec.ts` (E2E-01) belongs to T-40.
- **Acceptance**: `pnpm test:e2e` (full suite) passes locally twice in a row and in CI; no `waitForTimeout` (`grep -rn waitForTimeout tests/e2e` prints nothing).
- **Depends on**: T-35, T-31

## M6 Polish and deploy

### T-40 Landing, `/how-it-works` and `/privacy`

- **Goal**: The public pages with exact copy and live data from the rubric and eval results.
- **Implements**: FR-52; PRD §9.3, §9.11, §9.12; A-12, A-22
- **Files**: `app/page.tsx`, `app/how-it-works/page.tsx`, `app/privacy/page.tsx`, `content/pages/privacy.md`, `components/pages/*`, `components/common/safe-markdown.tsx`, `tests/component/safe-render.test.tsx` (CT-09, SafeMarkdown part), `tests/e2e/pages.spec.ts` (E2E-31), `tests/e2e/landing.spec.ts` (E2E-01).
- **Steps**: Verify A-12 and A-22 against vendor sources before finalising the privacy copy; link the sources at the bottom of `/privacy` ("Sources" list).
- **Acceptance**: CT-09, E2E-01, E2E-31 pass; A-12 and A-22 recorded.
- **Depends on**: T-37

### T-41 Accessibility, responsive, motion, theme and security pass

- **Goal**: Meet NFR-08, NFR-09, NFR-13 everywhere.
- **Implements**: NFR-08, NFR-09, NFR-13; TRD §19.4, §21; A-17
- **Files**: any component; `tests/e2e/a11y.spec.ts` extended states.
- **Steps**:
  1. Manual VoiceOver (macOS Safari) run of a text session: every phase announced once, no flood during recording or timers.
  2. Manual keyboard run of a voice session in Chrome.
  3. Check contrast pairs from TRD §19.2 in both themes.
  4. Review CSP, headers and `Permissions-Policy` on a preview (A-17).
- **Acceptance**: E2E-24, E2E-25, E2E-27, E2E-30 pass; manual notes in the PR; A-17 recorded.
- **Depends on**: T-39, T-40

### T-42 Performance budgets

- **Goal**: Meet NFR-06 and NFR-07.
- **Implements**: NFR-04 – NFR-07; TRD §24
- **Files**: as needed (dynamic imports, bundle trimming).
- **Acceptance**: `pnpm build` output shows First Load JS ≤ 140 KB for `/` and ≤ 200 KB for `/session/[id]`; local Lighthouse mobile on `pnpm start` meets NFR-06 for `/` and `/sample` (median of 3).
- **Depends on**: T-41

### T-43 Provision Upstash and OpenAI; verify free tiers

- **Goal**: External services ready with budgets and recorded limits.
- **Implements**: NFR-12; TRD §28.1, §28.2, §28.5; A-04, A-05
- **Steps**: TRD §28.1 and §28.2; compute `C_fb_max` and `cap_fit` with TRD §23.3 from the pinned prices and the configured `MAX_OUTPUT_TOKENS_FEEDBACK`; choose `RATE_LIMIT_GLOBAL_LLM_DAILY` by the D-33 rule (depends on A-04); record A-04, A-05, `C_fb_max`, the chosen cap and the worst-case day and month.
- **Acceptance**: Decisions log rows exist for A-04, A-05 and the cap; a throwaway local run with `RATE_LIMIT_BACKEND=upstash` against the production database starts a session and gets feedback (owner).
- **Depends on**: T-24

### T-44 Vercel deployment, DNS and runbook test

- **Goal**: Production at https://rehearse.firatkil.com.
- **Implements**: TRD §28.3, §28.4, §28.6, §28.7; A-07, A-08, A-24
- **Steps**: TRD §28.3 – §28.6; verify A-07, A-08, A-24; test the readonly switch and rollback once.
- **Acceptance**: `curl -s https://rehearse.firatkil.com/api/health` shows `"demoMode":"on"`, `"llmMode":"live"`, `"rateLimitBackend":"upstash"`; `curl -sI https://rehearse.firatkil.com` shows the TRD §21 headers; a live 3-question session with summary completes; readonly switch tested and reverted.
- **Depends on**: T-42, T-43

### T-45 README, demo GIF, browser verification and release

- **Goal**: Public v1.0.0.
- **Implements**: FR-57; TRD §29; A-11 (final)
- **Files**: `README.md`, `CHANGELOG.md`, `content/sample/session.json` (live), `.github/workflows/ci.yml` (drop `--allow-mock`).
- **Steps**:
  1. Owner runs `pnpm sample:generate` live; commit; drop `--allow-mock`.
  2. Manual browser matrix (A-11, A-25): Chrome, Edge, Safari macOS, Safari iOS, Firefox, Chrome Android; update the support table in the README and `/how-it-works`.
  3. README per TRD §29; record the GIF on production.
  4. Complete the release checklist; tag `v1.0.0`; GitHub release; repository description, topics and website.
- **Acceptance**: Release checklist complete; tag exists; CI green on the tag.
- **Depends on**: T-44

## Traceability: functional requirements to tasks and tests

| FR                               | Tasks            | Tests                             |
| -------------------------------- | ---------------- | --------------------------------- |
| FR-01                            | T-06             | UT-03                             |
| FR-02                            | T-06, T-07       | UT-03, `pnpm questions:validate`  |
| FR-03                            | T-06, T-07       | Review checklist in T-07 PR       |
| FR-04                            | T-14, T-20       | CT-01, CT-02, E2E-02              |
| FR-05                            | T-08, T-11, T-14 | UT-01, UT-32, E2E-04              |
| FR-06                            | T-20             | CT-02, E2E-02                     |
| FR-07                            | T-18             | UT-20, CT-01, E2E-03              |
| FR-08                            | T-17, T-21       | UT-18, E2E-05, E2E-06             |
| FR-09                            | T-20, T-21       | UT-19, E2E-06, E2E-09             |
| FR-10                            | T-15, T-17       | UT-18, E2E-07, E2E-09             |
| FR-11                            | T-19, T-21       | UT-16, UT-17, E2E-06, E2E-07      |
| FR-12                            | T-17, T-21       | E2E-05, E2E-10                    |
| FR-13                            | T-17             | CT-05, E2E-06                     |
| FR-14                            | T-17, T-21       | CT-05, E2E-07                     |
| FR-15                            | T-19, T-21       | UT-16, E2E-08                     |
| FR-16                            | T-21             | UT-18, E2E-09                     |
| FR-17                            | T-17             | UT-18, E2E-05                     |
| FR-18                            | T-17             | UT-18, E2E-17                     |
| FR-19                            | T-25, T-26, T-27 | UT-22, UT-23, UT-33, EV-01, EV-02 |
| FR-20                            | T-26, T-28       | UT-24, CT-03, EV-11               |
| FR-21                            | T-26, T-28       | UT-23, CT-03                      |
| FR-22                            | T-26, T-28       | UT-23, CT-03                      |
| FR-23                            | T-25, T-26       | UT-21, UT-23, EV-07, EV-08        |
| FR-24                            | T-16, T-22       | UT-04 – UT-07, CT-04              |
| FR-25                            | T-16             | UT-05                             |
| FR-26                            | T-28             | E2E-11                            |
| FR-27                            | T-28             | E2E-11                            |
| FR-28                            | T-29, T-30       | UT-27, E2E-19                     |
| FR-29                            | T-29, T-30       | UT-26, UT-34, CT-07, E2E-20       |
| FR-30                            | T-29, T-30       | UT-27, CT-07, E2E-19              |
| FR-31                            | T-30             | E2E-19                            |
| FR-32                            | T-30             | UT-28, E2E-19                     |
| FR-33                            | T-31             | UT-40, E2E-21                     |
| FR-34                            | T-13, T-32       | UT-12, UT-13                      |
| FR-35                            | T-15, T-33       | UT-18, E2E-16                     |
| FR-36                            | T-34             | CT-08, E2E-17                     |
| FR-37                            | T-35             | UT-15, E2E-18                     |
| FR-38                            | T-34             | UT-13, E2E-17                     |
| FR-39                            | T-13, T-33       | E2E-23                            |
| FR-40                            | T-10, T-11, T-27 | UT-08, UT-32, UT-33, E2E-12       |
| FR-41                            | T-09             | UT-10, UT-11, E2E-12              |
| FR-42                            | T-09             | UT-11, E2E-13                     |
| FR-43                            | T-11, T-27       | UT-33, E2E-28                     |
| FR-44                            | T-02, T-11, T-27 | UT-32, UT-33, E2E-14, E2E-15      |
| FR-45                            | T-24, T-27       | UT-29, UT-33                      |
| FR-46                            | T-14             | E2E-12, E2E-14                    |
| FR-47                            | T-12             | UT-35                             |
| FR-48                            | T-36             | UT-36                             |
| FR-49                            | T-37             | UT-37, UT-38                      |
| FR-50                            | T-38             | Workflow run on a PR              |
| FR-51                            | T-09, T-24       | UT-10, UT-30, UT-39               |
| FR-52                            | T-40             | E2E-01, E2E-31                    |
| FR-53                            | T-05             | E2E-26                            |
| FR-54                            | T-18, T-33       | UT-20, E2E-03, E2E-23             |
| FR-55                            | T-21             | E2E-22                            |
| FR-56                            | T-03, T-27       | UT-33, logger test                |
| FR-57                            | T-45             | Release checklist                 |
| FR-58 (Could)                    | T-17             | E2E-24                            |
| FR-59 (Could, UI deferred, D-34) | T-16             | UT-05 (enabled list)              |

## Release checklist

Functional

- [ ] All Must FRs implemented; any Should or Could not done has a decisions log entry.
- [ ] Every state in PRD §9.4, §9.6, §9.8 and §9.9 checked on production by hand (quota and cap states may be checked on a preview with lowered limits and `LLM_MODE=mock`).
- [ ] Copy on all pages matches PRD §9 (spot-check 25 strings).
- [ ] Voice session completes in desktop Chrome and Edge; Firefox shows the synthesis-only notice and completes a text session; Safari macOS and iOS behaviour recorded in the support table (A-11).

Quality

- [ ] CI green on `main`: lint (with content checks), typecheck, unit and component with coverage, E2E, build.
- [ ] Coverage thresholds met (TRD §25.5).
- [ ] Latest committed eval run passes every threshold; README table matches `eval/results/latest.json`; injection resistance 1.00.
- [ ] `pnpm questions:validate` shows every cell ≥ 5 and 120 active questions.
- [ ] `content/sample/session.json` is live model output (`pnpm sample:validate` without `--allow-mock`).

Accessibility and performance

- [ ] axe: zero serious or critical issues (E2E-30).
- [ ] Manual VoiceOver pass of a text session; manual keyboard pass of a voice session.
- [ ] 360 px check on a real phone (Android Chrome voice session, iOS Safari text session).
- [ ] Lighthouse mobile on production meets NFR-06 (median of 3) for `/` and `/sample`.
- [ ] NFR-01 – NFR-03 measured on production and recorded.

Security and privacy

- [ ] `curl -sI https://rehearse.firatkil.com` shows every header in TRD §21 item 3; two requests return different nonces.
- [ ] Production logs for a feedback call contain no transcript text, IP or token (inspect one `feedback.done` line).
- [ ] No secrets in the repository (`git log -p | grep -E "sk-(proj-)?[A-Za-z0-9]{20,}"` prints nothing); GitHub secret scanning shows no alerts.
- [ ] Production secrets differ from preview and example values; `LLM_MODE=live` and `RATE_LIMIT_BACKEND=upstash` in production only.
- [ ] `/privacy` statements verified against vendor sources (A-12, A-22) with links.

Cost

- [ ] OpenAI project budget and alert set; prepaid credit with auto-recharge off (or verified hard limit, A-04).
- [ ] `RATE_LIMIT_GLOBAL_LLM_DAILY` chosen with TRD §23.3; worst-case monthly cost in the README.
- [ ] Vercel and Upstash free-tier checks in TRD §28.5 done and recorded.
- [ ] No uptime monitor pinging more often than every 30 minutes.

Operations

- [ ] Runbook (TRD §28.7) tested once: readonly and back; rollback by promoting a previous deployment.
- [ ] `eval.yml` has run green at least once.

Docs and release

- [ ] README complete per TRD §29; fresh-clone test: `pnpm install && cp .env.example .env.local && pnpm dev:mock` gives a scored text answer in under 10 minutes.
- [ ] Demo GIF recorded on production with fictional answers.
- [ ] `CHANGELOG.md` v1.0.0 entry; tag `v1.0.0`; GitHub release; repository description, topics (`nextjs`, `web-speech-api`, `llm`, `evaluation`, `accessibility`) and website set.
- [ ] Link from firatkil.com added (separate repository).
