# Progress

Local repository setup completed on 2026-10-21. Initial specifications and agent rules: `3af2b8c`. The executable commit hook is enabled through `core.hooksPath=.githooks`; author and committer identities match AGENTS.md. Public remote: https://github.com/firatkill/rehearse. Owner approval recorded in D-43.

Tasks are executed in order. Stop for owner review at each milestone boundary. A completion commit is recorded only after the task acceptance checks pass.

| Task | Description                                                        | Status | Completion commit |
| ---- | ------------------------------------------------------------------ | ------ | ----------------- |
| T-01 | Scaffold the repository, tooling and CI skeleton                   | done   | b0a87d3           |
| T-02 | Configuration, environment, errors and labels                      | done   | a45e7e3           |
| T-03 | Logging, request id and security headers                           | done   | 1756087           |
| T-04 | Test runners and full CI                                           | done   | 1e662d3           |
| T-05 | Design tokens, fonts, layout shell, theme and banners              | done   | 42a528c           |
| T-06 | Question schema, loader, validator and the 15 example questions    | done   | f8383ee           |
| T-07 | Write the remaining 105 questions                                  | done   | 1475f7a           |
| T-08 | Seeded PRNG and deterministic selection                            | doing  | —                 |
| T-09 | Rate-limit adapter, visitor id and quotas                          | todo   | —                 |
| T-10 | Session token                                                      | todo   | —                 |
| T-11 | API contracts, client and `POST /api/sessions/start`               | todo   | —                 |
| T-12 | `GET /api/health`                                                  | todo   | —                 |
| T-13 | Record schemas, repository interface and memory repository         | todo   | —                 |
| T-14 | Setup page                                                         | todo   | —                 |
| T-15 | Room state machine                                                 | todo   | —                 |
| T-16 | Words, fillers and the delivery block (text mode)                  | todo   | —                 |
| T-17 | Text-mode interview room                                           | todo   | —                 |
| T-18 | Capability detection, microphone check and setup capability states | todo   | —                 |
| T-19 | Recognizer adapter, transcript assembly and recorder machine       | todo   | —                 |
| T-20 | Speech synthesis, voices, captions and the voice picker            | todo   | —                 |
| T-21 | Voice room integration                                             | todo   | —                 |
| T-22 | Voice delivery metrics                                             | todo   | —                 |
| T-23 | Voice E2E with the speech mock                                     | todo   | —                 |
| T-24 | LLM provider (live and mock), model pinning and cost estimate      | todo   | —                 |
| T-25 | Rubric, prompts, sanitization and versioning                       | todo   | —                 |
| T-26 | Feedback schemas, normalization, evidence and `generateFeedback`   | todo   | —                 |
| T-27 | `POST /api/feedback`                                               | todo   | —                 |
| T-28 | Feedback UI: skeleton, card, errors and retries                    | todo   | —                 |
| T-29 | Aggregates, summary generation and `POST /api/summary`             | todo   | —                 |
| T-30 | Report page, chart, Markdown export and print                      | todo   | —                 |
| T-31 | Sample session and `/sample`                                       | todo   | —                 |
| T-32 | IndexedDB wrapper, migrations and IndexedDB repository             | todo   | —                 |
| T-33 | Persistence wiring and recovery after reload                       | todo   | —                 |
| T-34 | History page and deletion                                          | todo   | —                 |
| T-35 | Export and import                                                  | todo   | —                 |
| T-36 | Golden set                                                         | todo   | —                 |
| T-37 | Eval runner, metrics, thresholds and budget guard                  | todo   | —                 |
| T-38 | Eval workflow                                                      | todo   | —                 |
| T-39 | Complete the E2E suite                                             | todo   | —                 |
| T-40 | Landing, `/how-it-works` and `/privacy`                            | todo   | —                 |
| T-41 | Accessibility, responsive, motion, theme and security pass         | todo   | —                 |
| T-42 | Performance budgets                                                | todo   | —                 |
| T-43 | Provision Upstash and OpenAI; verify free tiers                    | todo   | —                 |
| T-44 | Vercel deployment, DNS and runbook test                            | todo   | —                 |
| T-45 | README, demo GIF, browser verification and release                 | todo   | —                 |

## Open questions for the owner

- T-01 owner check on GitHub: enable Dependabot alerts. Secret scanning and push protection are already enabled (verified through GitHub API).

- No action needed on the other project’s ports: owner authorised E2E_BASE_PORT (D-55); local runs use free ports 3240–3243. T-07 E2E also passed in isolated CI (39570707129).

## Verification limits

- M0 (T-01–T-05) is complete. Owner authorised M1 continuation on 2026-10-21. [Milestone QA report](../qa/M0-REPORT.md).
- All five CI jobs passed on T-05: https://github.com/firatkill/rehearse/actions/runs/39566353571.
- 36 unit/component tests and eight Chromium tests pass. Coverage: 100% lines/functions, 96% branches. Shell axe checks pass in both themes.
- No real microphone, Safari, screen-reader, live LLM, Upstash or deployed-environment verification yet; these belong to later tasks. Health and eval remain the planned T-04 stubs.
- The pnpm 12 Node launcher is required on this local machine because the older pnpm auto-switch returned ENOEXEC; CI uses the pinned version successfully.
- No unresolved product choices. OWNER-DECISIONS.md’s project-specific no-database decision applies; approved exceptions are in the PRD decisions log.
