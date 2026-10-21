# Progress

Local repository setup completed on 2026-10-21. Initial specifications and agent rules: `3af2b8c`. The executable commit hook is enabled through `core.hooksPath=.githooks`; author and committer identities match AGENTS.md. Public remote: https://github.com/firatkill/rehearse. Owner approval recorded in D-43.

Tasks are executed in order. Stop for owner review at each milestone boundary. A completion commit is recorded only after the task acceptance checks pass.

| Task | Description                                                        | Status  | Completion commit            |
| ---- | ------------------------------------------------------------------ | ------- | ---------------------------- |
| T-01 | Scaffold the repository, tooling and CI skeleton                   | done    | b0a87d3                      |
| T-02 | Configuration, environment, errors and labels                      | done    | a45e7e3                      |
| T-03 | Logging, request id and security headers                           | done    | 1756087                      |
| T-04 | Test runners and full CI                                           | done    | 1e662d3                      |
| T-05 | Design tokens, fonts, layout shell, theme and banners              | done    | 42a528c                      |
| T-06 | Question schema, loader, validator and the 15 example questions    | done    | f8383ee                      |
| T-07 | Write the remaining 105 questions                                  | done    | 1475f7a                      |
| T-08 | Seeded PRNG and deterministic selection                            | done    | 95957c3                      |
| T-09 | Rate-limit adapter, visitor id and quotas                          | done    | a79a194                      |
| T-10 | Session token                                                      | done    | 5fd2f24                      |
| T-11 | API contracts, client and `POST /api/sessions/start`               | done    | b9d7f85                      |
| T-12 | `GET /api/health`                                                  | done    | 59c4c15                      |
| T-13 | Record schemas, repository interface and memory repository         | done    | 95b6e18                      |
| T-14 | Setup page                                                         | done    | f40159a                      |
| T-15 | Room state machine                                                 | done    | 4df5f00                      |
| T-16 | Words, fillers and the delivery block (text mode)                  | done    | ec8a2b6                      |
| T-17 | Text-mode interview room                                           | done    | e88dca0                      |
| T-18 | Capability detection, microphone check and setup capability states | done    | eac718d                      |
| T-19 | Recognizer adapter, transcript assembly and recorder machine       | done    | 8eb3c8b                      |
| T-20 | Speech synthesis, voices, captions and the voice picker            | done    | 46134d9                      |
| T-21 | Voice room integration                                             | blocked | dcd7293                      |
| T-22 | Voice delivery metrics                                             | done    | 678d785                      |
| T-23 | Voice E2E with the speech mock                                     | done    | 742ba00                      |
| T-24 | LLM provider (live and mock), model pinning and cost estimate      | blocked | 1765148                      |
| T-25 | Rubric, prompts, sanitization and versioning                       | done    | 835478b                      |
| T-26 | Feedback schemas, normalization, evidence and `generateFeedback`   | done    | b50b280                      |
| T-27 | `POST /api/feedback`                                               | blocked | fde48e6                      |
| T-28 | Feedback UI: skeleton, card, errors and retries                    | done    | f5c8387                      |
| T-29 | Aggregates, summary generation and `POST /api/summary`             | done    | 267cd8b                      |
| T-30 | Report page, chart, Markdown export and print                      | done    | 8618b04                      |
| T-31 | Sample session and `/sample`                                       | done    | 6796b4c                      |
| T-32 | IndexedDB wrapper, migrations and IndexedDB repository             | done    | 1f52ade                      |
| T-33 | Persistence wiring and recovery after reload                       | blocked | 16c2eb7 (manual TC-101 only) |
| T-34 | History page and deletion                                          | done    | this commit                  |
| T-35 | Export and import                                                  | todo    | —                            |
| T-36 | Golden set                                                         | todo    | —                            |
| T-37 | Eval runner, metrics, thresholds and budget guard                  | todo    | —                            |
| T-38 | Eval workflow                                                      | todo    | —                            |
| T-39 | Complete the E2E suite                                             | todo    | —                            |
| T-40 | Landing, `/how-it-works` and `/privacy`                            | todo    | —                            |
| T-41 | Accessibility, responsive, motion, theme and security pass         | todo    | —                            |
| T-42 | Performance budgets                                                | todo    | —                            |
| T-43 | Provision Upstash and OpenAI; verify free tiers                    | todo    | —                            |
| T-44 | Vercel deployment, DNS and runbook test                            | todo    | —                            |
| T-45 | README, demo GIF, browser verification and release                 | todo    | —                            |

## Open questions for the owner

- T-33 / TC-101: real Chrome microphone reload during recording, confirming restored review and notice; not verified by automation.

- M3: owner approved staged live eval and missing mock copy (D-64/D-65); no pending decision.
- T-31: before T-45, owner must generate the sample live, validate without --allow-mock, and remove the temporary CI flag (TC-090).
- T-27: owner-only live feedback and token-size measurement remain pending (TC-089).
- T-24: live model verification TC-088 needs owner-configured credentials and the owner-only toy call; no local key is configured.

- T-21 physical QA remains required: a three-question spoken Chrome session and A-14/A-15/A-20/A-25 on Chrome/Edge/Safari/Android/iOS (TC-063/TC-064). Automated speech mocks and the live Chrome text pass do not satisfy these checks.

- T-01 owner check on GitHub: enable Dependabot alerts. Secret scanning and push protection are already enabled (verified through GitHub API).

- No action needed on the other project’s ports: owner authorised E2E_BASE_PORT (D-55); local runs use free ports 3240–3243. T-07 E2E also passed in isolated CI (39570707129).

## Verification limits

- M0 (T-01–T-05) is complete. Owner authorised M1 continuation on 2026-10-21. [Milestone QA report](../qa/M0-REPORT.md).
- All five CI jobs passed on T-05: https://github.com/firatkill/rehearse/actions/runs/39566353571.
- 36 unit/component tests and eight Chromium tests pass. Coverage: 100% lines/functions, 96% branches. Shell axe checks pass in both themes.
- No real microphone, Safari, screen-reader, live LLM, Upstash or deployed-environment verification yet; these belong to later tasks. Health is implemented in T-12; eval remains the planned stub until T-37.
- The pnpm 12 Node launcher is required on this local machine because the older pnpm auto-switch returned ENOEXEC; CI uses the pinned version successfully.
- No unresolved product choices. OWNER-DECISIONS.md’s project-specific no-database decision applies; approved exceptions are in the PRD decisions log.

## M1 milestone boundary

T-06–T-17 are implemented. Stop here for owner review before T-18. See [M1 QA report](../qa/M1-REPORT.md). Local verification: 196 unit/component tests, 15 Chromium E2E tests, lint, typecheck, production build and coverage gates pass. Firefox Nightly 157.0 completed three text answers through the report; title fixes were retested from setup through a saved-answer report. Stock Firefox release, real microphone/Safari, live LLM/Upstash and deployment remain unverified. Memory storage and the placeholder report are intentional until their later tasks. T-17 CI passed: https://github.com/firatkill/rehearse/actions/runs/39591865691.

## M2 in progress

Owner authorised M2 continuation. M1 CI passed: https://github.com/firatkill/rehearse/actions/runs/39591865691. TC-046–TC-065 define the M2 QA scope before implementation. Owner approved staged E2E-06 practice-only saving until feedback/report implementation in M3 (D-58).

T-19 CI passed: https://github.com/firatkill/rehearse/actions/runs/39594914682. T-20 adds voice selection, preview, chunked playback and captions; all 260 unit/component tests and 19 browser tests pass. Real voice-room integration and physical browser checks remain T-21–T-23.

T-21 implementation and automated acceptance are complete; status is blocked only on the explicit physical microphone/browser acceptance checks (TC-063/TC-064). T-22 and T-23 can proceed independently. T-20 CI passed: https://github.com/firatkill/rehearse/actions/runs/39595922972.

T-21 CI passed: https://github.com/firatkill/rehearse/actions/runs/39606885914. T-22 voice metrics pass normative vectors and UI assertions; A-21 is recorded in D-61.

## M2 milestone boundary

T-18–T-23 implementation and automated checks are complete. T-21 remains blocked only on physical acceptance TC-063/TC-064. Stop before M3 for owner review. See [M2 QA report](../qa/M2-REPORT.md). Verification: 273 unit/component tests, 33 E2E tests, two consecutive 14-test voice runs, lint, typecheck, build and coverage gates pass. T-22 CI passed: https://github.com/firatkill/rehearse/actions/runs/39607399315. T-23 CI passed: https://github.com/firatkill/rehearse/actions/runs/39608688255.

## M3 in progress

Owner authorised continuation on 2026-10-21. M2 CI passed all five jobs: https://github.com/firatkill/rehearse/actions/runs/39608688255. M3 cases TC-066–TC-090 are designed before code. Owner approved staged live eval until T-37 and defining missing mock copy (D-64/D-65). T-24 live model request remains an owner-only acceptance check.

T-24 provider/cost slice: normative interface, SDK 7 adapter and cost calculation implemented with 23 new contract/vector tests. All 296 unit/component and 33 E2E tests pass, with lint, typecheck, build, coverage and ledger gates. This is a partial task commit: mock provider, dispatcher and final model pinning remain; pending clarification and owner live verification are listed above.

T-24 implementation is complete; status is blocked only on the owner-only live model/temperature check TC-088. Model candidate and documented prices are pinned in .env.example (D-66); availability and quality are not claimed. D-64/D-65 approve staged eval and mock copy. The provider/cost slice CI passed all five jobs: https://github.com/firatkill/rehearse/actions/runs/39616978679. Continue independent M3 tasks with live checks visibly pending.

T-25: exact normative v1 prompts, rubric and sanitized user templates implemented. 338 unit/component tests, 33 E2E tests, lint, typecheck, build and coverage pass (98.98% lines, 91.01% branches, 100% functions). Live eval is deferred under D-64.

T-25 CI passed: https://github.com/firatkill/rehearse/actions/runs/39622355076. T-26 normalization, evidence verification and bounded orchestration pass 376 unit/component and 33 E2E tests, lint, typecheck, build and coverage. Local full browser runs should not overlap lint/coverage on this machine; unchanged affected tests passed in isolation and the final full run. Live eval remains deferred under D-64.

T-26 CI passed: https://github.com/firatkill/rehearse/actions/runs/39623630129. T-27 implementation and automated API acceptance are complete; only owner live acceptance TC-089 remains blocked. All 390 unit/component tests and coverage gates pass (98.95% lines, 91.61% branches, 100% functions), with lint, typecheck and build.

T-27 full E2E: all 33 tests pass on ports 3240–3243.

T-27 CI passed: https://github.com/firatkill/rehearse/actions/runs/39625319993. T-28 connects scoring, persistence, accessible feedback cards, bounded retries and exact error states. 410 unit/component and 38 E2E tests pass, including three-question scored text and mocked voice flows; lint, typecheck, build and coverage gates pass.

T-28 CI passed: https://github.com/firatkill/rehearse/actions/runs/39626602747. T-29 implements shared deterministic report aggregates, one-attempt summary generation and the scoped summary API. 433 unit/component and 38 E2E tests pass; lint, typecheck, build and coverage gates pass. Live summary quality remains deferred under D-64.

T-29 CI passed: https://github.com/firatkill/rehearse/actions/runs/39627414478. T-30 replaces the placeholder report with summary/fallback states, deterministic tables and chart, focus tips, expandable answers, Markdown download and print restoration. All 444 unit/component and 43 browser tests pass, with typecheck, build and coverage gates. The transcript assertion is scoped to its disclosure because verified evidence may repeat it.

## M3 milestone boundary

T-24–T-31 implementation and automated QA are complete. Stop before M4/T-32 for owner review. T-24 and T-27 remain blocked only on owner live acceptance (TC-088/TC-089); the mock sample is explicitly permitted by T-31, with live replacement required before T-45 (TC-090). See [M3 QA report](../qa/M3-REPORT.md).

T-30 CI passed: https://github.com/firatkill/rehearse/actions/runs/39629175254. Final local checks: lint, ledger integrity, 472 unit/component tests, 44 E2E tests, typecheck, production build, sample validation with --allow-mock, and coverage gates (98.60% lines, 91.74% branches, 100% functions). Strict sample validation correctly rejects mock provenance. T-31 CI passed all five jobs: https://github.com/firatkill/rehearse/actions/runs/39631383645.

No live LLM/eval, Upstash, physical microphone or Safari/mobile speech verification was performed. D-64 defers the live eval gate until T-37. Physical M2 checks TC-063/TC-064 remain outstanding. Local full checks should run sequentially; four Vitest workers avoid competing with other applications. The unchanged card test passed on isolated retest and in the final full suite after a loaded-machine timeout.

Final M3 spec review corrected feedback/summary failure logging to TRD §20 levels and added the safe summary item count from §22. The shared mapping and actual API log levels have spec-derived tests. All 472 unit/component and 44 E2E tests pass after the correction; the handoff remains at M3 with no T-32 work.

Final M3 UI review corrected blocking-error announcements, normative score-bar geometry/tokens and report/footer touch targets. Targeted browser checks passed for feedback errors, speech errors and reports; final regression results are recorded in the QA ledger. No M4 work started.

## M4 in progress

Owner authorised continuation after M3. TC-091–TC-101 designed before implementation. Owner approved per-session import validation (D-68); no pending M4 decisions. Physical voice reload remains a manual check.

T-32: IndexedDB migrations, repository and stable selection facade implemented. UT-12–14 and selection tests pass; 487 unit/component and 44 E2E tests pass, storage line coverage 96.04%; lint, typecheck and production build pass. A-18 recorded as D-67. CI verification follows push.

T-32 CI passed all jobs: https://github.com/firatkill/rehearse/actions/runs/39660925984. T-33 is in progress; TC-101 needs an owner physical Chrome voice-recording reload check. Mocked speech does not satisfy that check.

T-33 implementation and automated acceptance passed: restored drafts/review edits/thinking/feedback, storage fallback and versionchange banners, once-only persistence request, and sample storage isolation. Final regression: 490 unit/component and 49 E2E tests; coverage thresholds, build and typecheck passed. Physical Chrome voice reload TC-101 remains unverified; independent T-34 can proceed.

T-33 CI passed all jobs: https://github.com/firatkill/rehearse/actions/runs/39663016318. T-34 implements history and confirmed deletion; export/import controls follow in T-35 as planned.

T-34: history list, resume/report actions, single deletion and blocked delete-all implemented. CT-08 and E2E-17 pass, including 360 px layout and preference isolation. Final regression: 494 unit/component and 51 E2E tests, build/typecheck and coverage gates passed.
