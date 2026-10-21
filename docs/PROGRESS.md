# Progress

Local repository setup completed on 2026-10-21. Initial specifications and agent rules: `3af2b8c`. The executable commit hook is enabled through `core.hooksPath=.githooks`; author and committer identities match AGENTS.md. Public remote: https://github.com/firatkill/rehearse. Owner approval recorded in D-43.

Tasks are executed in order. Stop for owner review at each milestone boundary. A completion commit is recorded only after the task acceptance checks pass.

| Task | Description                                                        | Status  | Completion commit |
| ---- | ------------------------------------------------------------------ | ------- | ----------------- |
| T-01 | Scaffold the repository, tooling and CI skeleton                   | done    | b0a87d3           |
| T-02 | Configuration, environment, errors and labels                      | done    | a45e7e3           |
| T-03 | Logging, request id and security headers                           | done    | 1756087           |
| T-04 | Test runners and full CI                                           | done    | 1e662d3           |
| T-05 | Design tokens, fonts, layout shell, theme and banners              | done    | 42a528c           |
| T-06 | Question schema, loader, validator and the 15 example questions    | done    | f8383ee           |
| T-07 | Write the remaining 105 questions                                  | done    | 1475f7a           |
| T-08 | Seeded PRNG and deterministic selection                            | done    | 95957c3           |
| T-09 | Rate-limit adapter, visitor id and quotas                          | done    | a79a194           |
| T-10 | Session token                                                      | done    | 5fd2f24           |
| T-11 | API contracts, client and `POST /api/sessions/start`               | done    | b9d7f85           |
| T-12 | `GET /api/health`                                                  | done    | 59c4c15           |
| T-13 | Record schemas, repository interface and memory repository         | done    | 95b6e18           |
| T-14 | Setup page                                                         | done    | f40159a           |
| T-15 | Room state machine                                                 | done    | 4df5f00           |
| T-16 | Words, fillers and the delivery block (text mode)                  | done    | ec8a2b6           |
| T-17 | Text-mode interview room                                           | done    | e88dca0           |
| T-18 | Capability detection, microphone check and setup capability states | done    | eac718d           |
| T-19 | Recognizer adapter, transcript assembly and recorder machine       | done    | 8eb3c8b           |
| T-20 | Speech synthesis, voices, captions and the voice picker            | done    | 46134d9           |
| T-21 | Voice room integration                                             | blocked | dcd7293           |
| T-22 | Voice delivery metrics                                             | done    | this commit       |
| T-23 | Voice E2E with the speech mock                                     | todo    | —                 |
| T-24 | LLM provider (live and mock), model pinning and cost estimate      | todo    | —                 |
| T-25 | Rubric, prompts, sanitization and versioning                       | todo    | —                 |
| T-26 | Feedback schemas, normalization, evidence and `generateFeedback`   | todo    | —                 |
| T-27 | `POST /api/feedback`                                               | todo    | —                 |
| T-28 | Feedback UI: skeleton, card, errors and retries                    | todo    | —                 |
| T-29 | Aggregates, summary generation and `POST /api/summary`             | todo    | —                 |
| T-30 | Report page, chart, Markdown export and print                      | todo    | —                 |
| T-31 | Sample session and `/sample`                                       | todo    | —                 |
| T-32 | IndexedDB wrapper, migrations and IndexedDB repository             | todo    | —                 |
| T-33 | Persistence wiring and recovery after reload                       | todo    | —                 |
| T-34 | History page and deletion                                          | todo    | —                 |
| T-35 | Export and import                                                  | todo    | —                 |
| T-36 | Golden set                                                         | todo    | —                 |
| T-37 | Eval runner, metrics, thresholds and budget guard                  | todo    | —                 |
| T-38 | Eval workflow                                                      | todo    | —                 |
| T-39 | Complete the E2E suite                                             | todo    | —                 |
| T-40 | Landing, `/how-it-works` and `/privacy`                            | todo    | —                 |
| T-41 | Accessibility, responsive, motion, theme and security pass         | todo    | —                 |
| T-42 | Performance budgets                                                | todo    | —                 |
| T-43 | Provision Upstash and OpenAI; verify free tiers                    | todo    | —                 |
| T-44 | Vercel deployment, DNS and runbook test                            | todo    | —                 |
| T-45 | README, demo GIF, browser verification and release                 | todo    | —                 |

## Open questions for the owner

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

T-06–T-17 are implemented. Stop here for owner review before T-18. See [M1 QA report](../qa/M1-REPORT.md). Local verification: 196 unit/component tests, 15 Chromium E2E tests, lint, typecheck, production build and coverage gates pass. Firefox Nightly 157.0 completed three text answers through the report; title fixes were retested from setup through a saved-answer report. Stock Firefox release, real microphone/Safari, live LLM/Upstash and deployment remain unverified. Memory storage and the placeholder report are intentional until their later tasks. T-17 CI is checked after pushing this commit.

## M2 in progress

Owner authorised M2 continuation. M1 CI passed: https://github.com/firatkill/rehearse/actions/runs/39591865691. TC-046–TC-065 define the M2 QA scope before implementation. Owner approved staged E2E-06 practice-only saving until feedback/report implementation in M3 (D-58).

T-19 CI passed: https://github.com/firatkill/rehearse/actions/runs/39594914682. T-20 adds voice selection, preview, chunked playback and captions; all 260 unit/component tests and 19 browser tests pass. Real voice-room integration and physical browser checks remain T-21–T-23.

T-21 implementation and automated acceptance are complete; status is blocked only on the explicit physical microphone/browser acceptance checks (TC-063/TC-064). T-22 and T-23 can proceed independently. T-20 CI passed: https://github.com/firatkill/rehearse/actions/runs/39595922972.

T-21 CI passed: https://github.com/firatkill/rehearse/actions/runs/39606885914. T-22 voice metrics pass normative vectors and UI assertions; A-21 is recorded in D-61.
