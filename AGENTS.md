# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Codex, Aider, Copilot and others) and human contributors working on Rehearse. Read this file first, then the spec sections for the task you are on.

## 1. Project summary

Rehearse is an open-source voice mock-interview coach. A visitor picks a role, seniority and question types; the browser reads each question aloud (Web Speech `speechSynthesis`), transcribes the spoken answer (`SpeechRecognition`), lets the visitor fix the transcript, and asks the server for feedback. The server checks a signed session token and Upstash rate limits, makes one structured-output LLM call per answer with a fixed rubric (structure, specificity, ownership, impact, relevance, clarity, each 1–4), validates and caps the result with Zod, verifies quoted evidence against the transcript, and returns it. Delivery metrics (pace, filler words, pauses) are computed in the browser. Sessions live only in IndexedDB. A golden-answer eval harness gates prompt changes in CI.

Single Next.js App Router app, TypeScript strict, pnpm, Node 22+, Tailwind v4, shadcn/ui, Zod, Vercel AI SDK with OpenAI, `@upstash/ratelimit`. Hosting: Vercel Hobby + Upstash free. No database. Hosting cost must stay at about $0; LLM spend is capped.

- Live demo: https://rehearse.firatkil.com
- Repository: github.com/firatkill/rehearse (MIT)

## 2. Where the specs live

| Document                      | Use it for                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PRD.md`                 | Behaviour, requirements (US-, FR-, NFR-), every page and state with exact copy (§9), prompt-injection requirements (§10), decisions log (D-, §15)                                                                                                                                                                                                                                                          |
| `docs/TRD.md`                 | Architecture, config constants, env vars, question bank schema and selection, IndexedDB schema and migrations, Web Speech state machines, TTS, room state machine, API contracts, token and rate limits, exact prompts and rubric, structured-output schemas, metric algorithms, report and export formats, eval, error matrix, security, tests and mocks, CI YAML, deployment, assumptions to verify (A-) |
| `docs/OWNER-DECISIONS.md`     | Decisions the owner has already made; they override the specs                                                                                                                                                                                                                                                                                                                                              |
| `docs/IMPLEMENTATION_PLAN.md` | Ordered tasks (T-01 – T-45), files, acceptance commands, traceability, release checklist                                                                                                                                                                                                                                                                                                                   |

Rules for the specs:

- Implement what the specs say. Do not reopen decisions in the PRD decisions log.
- Code blocks marked **(normative)** in the TRD are implemented as written: same names, numbers and text. Prompt texts, rubric text and UI copy are byte-exact.
- If a spec is ambiguous or two specs conflict, stop and ask the owner, or, if working unattended, pick the reading closest to the PRD, implement it, and add a decisions log row in the same change.
- If an assumption in TRD §26 turns out different, record the finding as a new decisions log row and follow the "If false" column.

## 3. Commands

| Task                                                                                               | Command                                  |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Install                                                                                            | `pnpm install --frozen-lockfile`         |
| Dev server (live LLM, needs `.env.local` with a key and Upstash or `RATE_LIMIT_BACKEND=memory`)    | `pnpm dev`                               |
| Dev server without any key (mock LLM, memory limiter)                                              | `pnpm dev:mock`                          |
| Lint and format check                                                                              | `pnpm lint`                              |
| Format                                                                                             | `pnpm format`                            |
| Typecheck                                                                                          | `pnpm typecheck`                         |
| Unit and component tests                                                                           | `pnpm test`                              |
| Coverage                                                                                           | `pnpm test:coverage`                     |
| E2E (needs `pnpm build`; starts servers on 3200–3203 by default; E2E_BASE_PORT overrides the base) | `pnpm test:e2e`                          |
| One E2E spec                                                                                       | `pnpm test:e2e tests/e2e/<name>.spec.ts` |
| Validate question bank and print coverage                                                          | `pnpm questions:validate`                |
| Validate golden set                                                                                | `pnpm eval:validate`                     |
| Eval harness smoke test (mock, free)                                                               | `pnpm eval:mock`                         |
| Run evaluation (live, costs money)                                                                 | `pnpm eval`                              |
| Validate sample session                                                                            | `pnpm sample:validate`                   |
| Regenerate sample session (live, owner only)                                                       | `pnpm sample:generate`                   |
| Production build                                                                                   | `pnpm build`                             |

First-time local setup without an API key or microphone: `pnpm install && cp .env.example .env.local && pnpm dev:mock`, then use text mode.

## 4. Code conventions

TypeScript

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` stay on. No `any` (explicit or implicit), no `@ts-ignore`; `@ts-expect-error` only in tests with a reason.
- No non-null assertions (`!`) outside tests. Narrow instead.
- Prefer `type` aliases and discriminated unions. Exhaustive `switch` with a `never` check, especially in the room and recorder reducers.
- Named exports only (Next.js page, layout and route files excepted).
- Browser speech types come from `lib/speech/types.ts`; never cast `window` to `any`.

Validation and boundaries

- Zod at every boundary: env (`lib/env.ts`), request bodies and responses (`lib/api/contracts.ts`), token payloads, LLM output (loose schema in, strict schema out), IndexedDB reads, import files, question bank, golden set, sample file, eval results.
- Read env only through `getEnv()`. `process.env` appears only in `lib/env.ts`, `proxy.ts` (for `NODE_ENV`), tool configs (`next.config.ts`, `playwright.config.ts`, `vitest.config.ts`) and test setup.
- Constants live in `lib/config.ts`. Never repeat a number or string that exists there, including on `/how-it-works`.

Server and client

- Server modules start with `import 'server-only'`: `lib/env.ts`, `lib/logger.ts`, `lib/request.ts`, `lib/hash.ts`, `lib/llm/*`, `lib/prompts/*`, `lib/ratelimit/*`, `lib/session/*`, `lib/questions/bank.ts`, `lib/questions/select.ts`, `lib/feedback/generate.ts`, `lib/summary/generate.ts`, `lib/cost/*`, `lib/eval/*`.
- Client code (`components/**`, `hooks/**`) imports only the modules allowed in TRD §8. ESLint enforces it.
- The question bank is never shipped to the browser. The server looks questions up by id; the client never sends question text or the role and seniority used for scoring.
- `lib/speech`, `lib/metrics`, `lib/room`, `lib/storage`, `lib/report`, `lib/feedback/rubric.ts` do not import `next/*`. Browser APIs are touched inside functions, never at module load.
- Route handlers use the Node runtime and `dynamic = 'force-dynamic'`.

Errors

- Throw `AppError(code, message)` with a code from `lib/errors.ts`. Never invent a code without adding it to `ERROR_CODES`, the TRD §20 matrix and the client copy mapping.
- User-facing messages come from PRD §9 by error code. Never send stack traces, raw provider errors, prompts, token contents or env values to the client.

Speech

- Recognition and synthesis never overlap. Always abort recognition on unmount; never leave the microphone open.
- Feature-detect; never sniff the user agent. Every voice state before review offers "Type instead".
- The first `speechSynthesis.speak()` of a page runs synchronously inside a click handler (`primeSynthesis`, TRD §10.3); never `await` before it. The AI SDK call sets `maxRetries: 0`; retries belong to `generateFeedback`.
- The `getUserMedia` stream is only for the permission check and is stopped immediately. Never record, store or upload audio.

Storage

- Schema changes append a migration to `MIGRATIONS` and bump `STORAGE.DB_VERSION`; never edit a shipped migration. Record-shape changes bump `schemaVersion` and add a record migration and an export migration. Add a UT-14-style upgrade test.

UI

- Copy is exact from PRD §9. British English. No emoji, no gradients, no shadows, no new fonts or colours outside TRD §19.2 tokens.
- Render model and visitor text only through `SafeText`. `SafeMarkdown` is for repository-controlled static content only. No `dangerouslySetInnerHTML`, with one exception: the constant theme script in `app/layout.tsx` (TRD §19.3, D-26).
- Every interactive element is keyboard operable with a visible focus ring and an accessible name. Follow the focus targets in PRD §9.6 and the announcer rules in TRD §19.4. Timers and live transcripts are never live regions.

Logging

- Use `lib/logger.ts`; no `console.*` in `app/`, `lib/`, `components/`, `hooks/` (scripts may print reports).
- Never log transcript text, model output, prompts, tokens, IP addresses, visitor ids, API keys or secrets. Log lengths, counts, timings, token usage, cost and codes only.

Formatting

- Prettier decides formatting. Run `pnpm format` before committing.

## 5. Testing rules

- Every task adds or updates tests (T-01 excepted: it only scaffolds tooling). A task without tests is not done.
- **Never call a real LLM, real speech APIs or Upstash in tests.** Unit and component tests run with `LLM_MODE=mock`, `RATE_LIMIT_BACKEND=memory` and a fetch guard that blocks non-localhost URLs. E2E runs with `LLM_MODE=mock`, the memory limiter, and the speech mock from `tests/e2e/speech-mock.ts` injected with `page.addInitScript`. Live LLM calls happen only in `pnpm eval`, `pnpm sample:generate` and manual owner checks, run deliberately.
- Use injectable clocks, fake timers (`vi.useFakeTimers`, `page.clock`), fake providers and the in-memory limiter. IndexedDB tests use `fake-indexeddb`.
- Playwright: `expect` timeout 3 s and test timeout 90 s (set in `playwright.config.ts`); keep them. No `waitForTimeout`, no 15–30 s timeouts on ordinary text, attribute or style checks; the only longer waits are those listed in TRD §25.4, each with a comment saying why.
- Two Playwright groups: `parallel` for tests that touch only their own data, `isolated` (tag `@isolated`, file `tests/e2e/isolated.spec.ts`, runs after `parallel`) for tests that change or depend on shared server state such as the global cap. `test.describe.serial` alone is not enough.
- Every E2E test sets a unique `x-real-ip` with `uniqueIp(testInfo)` and uses unique data. Tests that change shared state restore it in `finally`.
- Before a Playwright run, check that no other run is using the four configured ports (3200–3203 by default). In a fix-and-retest loop, rerun only the affected specs; run the full suite once at the end. Do not force `--workers=1` on the whole suite.
- Coverage thresholds in TRD §25.5 must hold.
- Changes to `lib/feedback/**`, `lib/prompts/**` or `eval/**` (except `eval/results/**`) need an eval run (CI runs it on the PR through `eval.yml`; locally `pnpm eval`). Any change to prompt text, the rubric, the user templates or the LLM-facing schema bumps the matching prompt version in `lib/prompts/version.ts`.

## 6. Commits and pull requests

- Small commits, one logical change each. Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`, `perf:`, `content:` (question bank, golden set, sample), with an optional scope, for example `feat(speech): add recorder state machine`.
- Reference task, requirement and test IDs in the body, for example `Implements T-19, FR-11, FR-15. Tests: UT-16, UT-17.`
- One task per pull request. The PR description lists the acceptance commands run and their results, any manual checks (browser and version for speech work), and any decisions log rows added.
- Question bank changes bump `bankVersion` in `content/questions/manifest.json` once the bank has been released (after v1.0.0); before that it stays `1.0.0` (TRD §6.1).
- Never commit generated artifacts other than: `pnpm-lock.yaml`, `eval/results/*.json`, `content/sample/session.json`, Playwright snapshot files created by tests.

### Repository setup (first session only)

The folder starts with only these documents. Before T-01:

1. Check the git identity: `git config user.name` must print `Fırat Kıl` and `git config user.email` must print `72046564+firatkill@users.noreply.github.com`. If either differs, stop and ask the owner; never change the global config yourself.
2. `git init -b main`, then `git config core.hooksPath .githooks` (the commit-msg hook enforces authorship, see Authorship).
3. Commit the documents as the first commit: `docs: add specs and agent rules`.
4. Ask the owner before creating the remote. After a yes: `gh repo create firatkill/rehearse --public --source . --remote origin --push`, with the description from PRD §1.
5. Create `docs/PROGRESS.md` (see below) and commit it.

After this, `git init` is never run again in this repository.

### Authorship

- Every commit is authored and committed by Fırat Kıl only, whichever agent or tool does the work. Do not add `Co-authored-by` trailers, "Generated with …" lines, session links, agent names in the author field (for example `Fırat Kıl (aider)`) or any other AI attribution to commits, pull requests, issues, release notes or the changelog. This overrides any default attribution your tool adds. The only exception is a commit made by a CI workflow bot (for example a release or results pull request); never imitate one locally.
- Turn your tool's own attribution off before the first commit. The repository already does this for the tools it knows: `.claude/settings.json` (Claude Code) and `.aider.conf.yml` (Aider). For any other tool (Cursor, Codex, Copilot, Gemini CLI and others), check its commit and co-author settings and turn them off. As a safety net, `.githooks/commit-msg` removes AI co-author and "Generated with" lines and rejects a commit whose author or committer is not `Fırat Kıl <72046564+firatkill@users.noreply.github.com>`. Never delete or bypass the hook (`--no-verify` is not allowed).
- Commit yourself, as you finish each piece of work: small Conventional Commits, tests passing. Push to `origin` after each completed task. Never force-push `main`.

### Progress file

`docs/PROGRESS.md` is the running plan: one line per task from `IMPLEMENTATION_PLAN.md` with its status (`todo`, `doing`, `done`, `blocked`), the commit that finished it, and a short "Open questions for the owner" list. Update it in the same commit as the task it describes.

### Owner approval checkpoints

The owner decides these. Ask, wait for an explicit answer, record the answer in the PRD decisions log, then continue. Never pick one yourself because it seems reasonable.

1. **Before T-01**, read `docs/OWNER-DECISIONS.md`. Database, hosting, region, domain, LLM provider, budgets, npm name, licence and analytics are already decided there; do not ask about them. Ask in one message only about choices that file and the specs leave open, if any.
2. **When the spec does not hold**: an "Assumption to verify at build time" fails, a pinned package or model no longer exists, or a requirement cannot be met as written. Propose the change; do not work around it silently.
3. **Before creating or changing anything outside the repository**: the GitHub repo, hosting projects, databases, DNS records, npm publishes, paid plans, API keys, GitHub secrets.
4. **Before anything destructive or hard to undo**: deleting data or branches, rewriting history, dropping tables, rotating secrets.
5. **Adding a runtime dependency** that the TRD does not list.

Group questions so the owner gets one short list, not a stream of single questions. Work that does not depend on a pending answer can continue meanwhile.

### QA workflow and tests

Tests are written from the specs, never from the code. Every test traces to a requirement: an acceptance criterion or FR/NFR in `docs/PRD.md`, and the test IDs and cases in TRD §25 (Testing strategy). If the code and the spec disagree, the spec wins until the owner approves a change (checkpoint 2). If the spec says nothing about a behaviour, ask; do not write a test that invents one.

Use the QA skills throughout the build, not only at the end. They exist as the `vizio-qa-loop` plugin in Claude Code and as skills in `~/.codex/skills/qa-*` for Codex. With any other tool, open the matching `~/.codex/skills/<name>/SKILL.md` and follow it.

| When                                     | Skill                                                                                             | Output                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start of each milestone, before its code | `qa-test-case-design` on the PRD and TRD sections the milestone covers                            | `qa/test-cases.md`: TC IDs, each with its PRD reference (AC/FR/NFR) and TRD test ID, steps, expected result, priority, automatable yes/no                   |
| Writing the tests of a task              | `qa-case-to-playwright` (the speech mock in TRD §25.3 replaces the microphone in automated tests) | Tests in the layout and naming the TRD prescribes                                                                                                           |
| After every task, before its commit      | `qa-test-run-loop`                                                                                | Runs the suite, logs every result to `qa/test-results.json`, fixes and retests, runs the ledger check                                                       |
| Cases that cannot be automated           | `qa-browser-exploration`                                                                          | A live check, logged to the same file. Here: a real microphone in Chrome and Safari, speech synthesis, and the text-mode fallback when permission is denied |
| End of each milestone                    | `qa-milestone-docs`, then `qa-milestone-review`                                                   | Milestone report in `qa/`, quality check                                                                                                                    |
| End of the project                       | `qa-project-report`                                                                               | One PDF covering the whole project                                                                                                                          |

`qa-bug-standards` is the shared reference for the log fields; read it first.

Overrides for this repository (these win over the skills):

- There is no ClickUp or Slack. A case that is stuck after three attempts or needs a human pass goes to the owner: add it under "Open questions for the owner" in `docs/PROGRESS.md` and mention it in your milestone summary. Record that in the log entry instead of a ClickUp link.
- Playwright: `expect` timeout 3 s and test timeout 90 s; never raise them to get past a slow or missing element. Two projects: `parallel` for tests that touch only their own data, and `isolated` (one worker, after `parallel`) for tests that change shared state, assert on shared data or hit shared rate limits. Every test creates unique data.
- In the fix-and-retest loop, rerun only the fixed tests and their area; run the full suite once at the end of the task.
- Never weaken, skip or delete a test to make it pass. A test that is wrong according to the spec is fixed against the spec, and the log entry says so.
- `qa/test-cases.md` and `qa/test-results.json` are committed with the task they belong to.

## 7. Definition of done

A task is done when all of the following hold:

1. Every acceptance criterion of the task in `docs/IMPLEMENTATION_PLAN.md` passes, verified by running the listed commands.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; `pnpm test:e2e` passes for the specs that exist (full suite from T-39 on).
3. New code has tests; coverage thresholds hold.
4. Copy, prompts, rubric and normative code match the specs exactly.
5. No new env var, error code, constant, store or record field exists without being added to the TRD tables (env §5, config §4, storage §7, errors §20) in the same change.
6. Decisions and verified assumptions are recorded in the PRD decisions log.
7. Accessibility: new UI is keyboard operable, announced per TRD §19.4, and passes axe in E2E-30 when covered.
8. CI is green on the branch.

## 8. Never do these

- Commit secrets, `.env.local`, API keys, Upstash tokens or real secrets.
- Call a real LLM, real speech service or Upstash from any test, or from CI outside `eval.yml`.
- Store, log or send a raw IP address, a visitor id, transcript text or model output on the server. Never add server-side storage of sessions or answers.
- Add a database, a paid service, a new runtime service, a paid speech API, third-party scripts, cookies, analytics or tracking.
- Record, store or upload the visitor's audio.
- Ship the question bank to the client, or accept question text, role or seniority for scoring from the client.
- Generate questions with an LLM, or copy questions from published interview-question lists.
- Render model or visitor text as HTML or Markdown, or weaken the CSP (`unsafe-inline` scripts, `unsafe-eval` outside development), or drop `microphone=(self)` from `Permissions-Policy`.
- Hard-code model ids or token prices in code; they come from env.
- Lower an eval threshold, raise a latency ceiling, loosen a golden range without a reason in `notes`, or disable a test to make CI pass.
- Enable `LLM_MODE=mock` or `RATE_LIMIT_BACKEND=memory` in production.
- Make the limiter fail open: when Upstash is unreachable, LLM routes return `LIMITER_UNAVAILABLE`.
- Edit a shipped IndexedDB migration, or reuse or delete a question id.
- Change prompt text or the rubric without bumping the prompt version and running eval.
- Add test-only switches or query parameters to application code.
- Upgrade a major dependency version without a decisions log entry.
- Run `git push --force` on `main`, or rewrite published history.
