# Progress

Local repository setup completed on 2026-10-21. Initial specifications and agent rules: `3af2b8c`. The executable commit hook is enabled through `core.hooksPath=.githooks`; author and committer identities match AGENTS.md. No remote has been created.

Tasks are executed in order. Stop for owner review at each milestone boundary. A completion commit is recorded only after the task acceptance checks pass.

| Task | Description | Status | Completion commit |
| --- | --- | --- | --- |
| T-01 | Scaffold the repository, tooling and CI skeleton | todo | — |
| T-02 | Configuration, environment, errors and labels | todo | — |
| T-03 | Logging, request id and security headers | todo | — |
| T-04 | Test runners and full CI | todo | — |
| T-05 | Design tokens, fonts, layout shell, theme and banners | todo | — |
| T-06 | Question schema, loader, validator and the 15 example questions | todo | — |
| T-07 | Write the remaining 105 questions | todo | — |
| T-08 | Seeded PRNG and deterministic selection | todo | — |
| T-09 | Rate-limit adapter, visitor id and quotas | todo | — |
| T-10 | Session token | todo | — |
| T-11 | API contracts, client and `POST /api/sessions/start` | todo | — |
| T-12 | `GET /api/health` | todo | — |
| T-13 | Record schemas, repository interface and memory repository | todo | — |
| T-14 | Setup page | todo | — |
| T-15 | Room state machine | todo | — |
| T-16 | Words, fillers and the delivery block (text mode) | todo | — |
| T-17 | Text-mode interview room | todo | — |
| T-18 | Capability detection, microphone check and setup capability states | todo | — |
| T-19 | Recognizer adapter, transcript assembly and recorder machine | todo | — |
| T-20 | Speech synthesis, voices, captions and the voice picker | todo | — |
| T-21 | Voice room integration | todo | — |
| T-22 | Voice delivery metrics | todo | — |
| T-23 | Voice E2E with the speech mock | todo | — |
| T-24 | LLM provider (live and mock), model pinning and cost estimate | todo | — |
| T-25 | Rubric, prompts, sanitization and versioning | todo | — |
| T-26 | Feedback schemas, normalization, evidence and `generateFeedback` | todo | — |
| T-27 | `POST /api/feedback` | todo | — |
| T-28 | Feedback UI: skeleton, card, errors and retries | todo | — |
| T-29 | Aggregates, summary generation and `POST /api/summary` | todo | — |
| T-30 | Report page, chart, Markdown export and print | todo | — |
| T-31 | Sample session and `/sample` | todo | — |
| T-32 | IndexedDB wrapper, migrations and IndexedDB repository | todo | — |
| T-33 | Persistence wiring and recovery after reload | todo | — |
| T-34 | History page and deletion | todo | — |
| T-35 | Export and import | todo | — |
| T-36 | Golden set | todo | — |
| T-37 | Eval runner, metrics, thresholds and budget guard | todo | — |
| T-38 | Eval workflow | todo | — |
| T-39 | Complete the E2E suite | todo | — |
| T-40 | Landing, `/how-it-works` and `/privacy` | todo | — |
| T-41 | Accessibility, responsive, motion, theme and security pass | todo | — |
| T-42 | Performance budgets | todo | — |
| T-43 | Provision Upstash and OpenAI; verify free tiers | todo | — |
| T-44 | Vercel deployment, DNS and runbook test | todo | — |
| T-45 | README, demo GIF, browser verification and release | todo | — |

## Open questions for the owner

- Approve creating the public GitHub repository `firatkill/rehearse`, adding it as `origin`, and pushing the local commits. Required by AGENTS.md Repository setup step 4 and owner approval checkpoint 3.

## Verification limits

- Application checks and CI have not run: T-01 has not started and the repository currently contains specifications and agent configuration only.
- No unresolved product choices were found in the initial review. OWNER-DECISIONS.md’s project-specific no-database decision applies.
