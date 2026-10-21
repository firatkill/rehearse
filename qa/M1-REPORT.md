# M1 Question bank, setup and text-mode room — QA report

Date: 2026-10-21. Scope: T-06–T-17. Sources: [case design](test-cases.md), [append-only results](test-results.json), [progress](../docs/PROGRESS.md), PRD and TRD. This is the requested milestone stopping point; M2 has not started.

## Delivered

The 120-question bank and deterministic selection; signed session tokens, memory/Upstash limiter adapters and quota ordering; validated API contracts, session creation and health metadata; record schemas and memory repository; setup preferences, seed handling and fallback panels; a pure room reducer; word/filler metrics; and the complete practice-only text flow through a placeholder report.

The room includes think-timer pause/resume, advisory answer timing, editable review, draft and checkpoint persistence, memory fallback after write failure, skip/end confirmations, focus targets and announcements. Synthesis is intentionally treated as unavailable until T-21. Feedback integration, persistent IndexedDB and the full report remain later tasks.

## Verification

- 196 unit/component tests pass across 28 files. Coverage: 98.83% lines, 90.27% branches, 100% functions. Room reducer: 93.18% lines; all configured thresholds pass.
- Full Chromium suite: 15 tests pass with four workers on local ports 3240–3243. Following the title fix, all four affected room/recovery scenarios passed again.
- Lint, typecheck, production build and question-bank validation pass. All 45 role/seniority/type cells meet the minimum coverage.
- Live native-browser pass: Firefox Nightly 157.0 from the existing Playwright cache, readonly production server on port 3250. Three typed answers reached the report intact; review counts, unavailable speech metrics, focus and saved states were inspected. A second setup-to-report pass verified the corrected titles and end-dialog focus.
- CI through T-16 is green: https://github.com/firatkill/rehearse/actions/runs/39589640063. T-17 CI is checked after pushing the implementation commit.

## Resolved

| Case   | Title                                              | Result                                 |
| ------ | -------------------------------------------------- | -------------------------------------- |
| TC-016 | Question schema rejects invalid records            | Passed; attempt history in the ledger. |
| TC-017 | Bank validator enforces integrity                  | Passed; attempt history in the ledger. |
| TC-018 | Complete bank meets distribution and coverage      | Passed; attempt history in the ledger. |
| TC-019 | Seeded PRNG has stable vectors                     | Passed; attempt history in the ledger. |
| TC-020 | Selection is deterministic and balanced            | Passed; attempt history in the ledger. |
| TC-021 | Selection fallback and exhaustion                  | Passed; attempt history in the ledger. |
| TC-022 | Visitor identity rotates by UTC day                | Passed; attempt history in the ledger. |
| TC-023 | Daily limits and session TTL match across adapters | Passed; attempt history in the ledger. |
| TC-024 | Limiter failures fail closed                       | Passed; attempt history in the ledger. |
| TC-025 | Quota checks consume in specified order            | Passed; attempt history in the ledger. |
| TC-026 | Signed token validates and rotates                 | Passed; attempt history in the ledger. |
| TC-027 | Token time bounds enforced                         | Passed; attempt history in the ledger. |
| TC-028 | API contracts and client boundary validation       | Passed; attempt history in the ledger. |
| TC-029 | Session start validates and supports all modes     | Passed; attempt history in the ledger. |
| TC-030 | Session quota and limiter outage                   | Passed; attempt history in the ledger. |
| TC-031 | Health response is complete and local              | Passed; attempt history in the ledger. |
| TC-032 | Memory repository satisfies the storage contract   | Passed; attempt history in the ledger. |
| TC-033 | Setup defaults, preferences, validation and seed   | Passed; attempt history in the ledger. |
| TC-034 | Setup fallback panels and demo modes               | Passed; attempt history in the ledger. |
| TC-035 | Room transitions and recovery                      | Passed; attempt history in the ledger. |
| TC-036 | Room submit guards                                 | Passed; attempt history in the ledger. |
| TC-037 | Deterministic words and filler counting            | Passed; attempt history in the ledger. |
| TC-038 | Text-mode delivery display                         | Passed; attempt history in the ledger. |
| TC-039 | Review validation and editing                      | Passed; attempt history in the ledger. |
| TC-040 | Readonly text session completes                    | Passed; attempt history in the ledger. |
| TC-041 | Skip and end dialogs                               | Passed; attempt history in the ledger. |
| TC-042 | Unknown session recovery                           | Passed; attempt history in the ledger. |
| TC-043 | Firefox text session                               | Passed; attempt history in the ledger. |
| TC-044 | Repository exchange contract prerequisite          | Passed; attempt history in the ledger. |
| TC-045 | Safe text prerequisite                             | Passed; attempt history in the ledger. |

## Pending decision

None. D-51–D-57 record approved interface/schema/eval exceptions and the alternative local E2E ports. OWNER-DECISIONS.md choices were not reopened. Live eval remains deferred for the initial scaffolding under D-52/D-54 until T-37.

## Manual test required and verification limits

No M1 case remains unexecuted. TC-043 passed in Firefox Nightly 157.0; stock Firefox release was not installed or tested. The earlier unavailable-browser attempt is retained in the ledger. This is not a real microphone, Safari, screen-reader, live LLM, live Upstash or deployed-environment pass. Those checks remain later scope. The owner still needs to enable Dependabot alerts, carried from M0 in PROGRESS.md.

Firefox logged the Zod capability probe being blocked by CSP. Inspection of the generated bundle confirmed a caught Function probe with a non-JIT fallback, and the complete session worked. CSP was not weakened. Font-preload warnings were also observed. Native DevTools were opened after completion; a complete per-step network trace was not captured. Automated API tests verify server boundaries, and this readonly session never requested feedback.

## Regressions, retractions and root causes

No recorded regression or retraction. Failed attempts are retained, including normative TypeScript lint adjustments, async test timer configuration, request-interception timing, a mistaken word-count expectation, and the loading/report title bugs found during the live pass. Title fixes were retested from setup through a report. No shared unresolved product-defect cluster remains.

## Requirement coverage

| References                                                        | M1 result                                                                                                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-01–FR-05, NFR-16; UT-01–UT-03                                  | Verified by TC-016–TC-021 and TC-033 for bank/schema/selection/setup.                                                                                              |
| FR-40–FR-42, FR-44, FR-46, FR-47, FR-51; UT-08–UT-11, UT-31/32/35 | Verified for token, quota, API and health scope by TC-022–TC-031 and TC-034/036; live providers remain later.                                                      |
| FR-34, FR-35, FR-37, FR-39; UT-13/15/18                           | Memory/record and reducer recovery scope verified by TC-032/035/044. IndexedDB, import UI and reload persistence are later.                                        |
| FR-08–FR-18, FR-58; CT-05, E2E-05/29                              | Text-mode scope verified by TC-035/036/039–TC-043, including keyboard shortcuts, timers, skip/end and recovery. Voice and feedback paths are not claimed complete. |
| FR-24, FR-25, FR-59; UT-04/05, CT-04                              | Text metrics verified by TC-037/038. Voice timing remains T-22.                                                                                                    |
| NFR-08, NFR-13; CT-09                                             | SafeText prerequisite, room keyboard/focus and existing shell axe verified; full accessibility/security pass remains T-41.                                         |

## Milestone review

1. Ledger integrity: checker passes; all 30 M1 cases have entries and retained attempt histories.
2. Coverage: 29 automatable cases have executable tests/checks; the remaining case has the documented native Firefox pass. Claims are limited to M1 portions of the requirements.
3. Automation: reviewed test names against TC and TRD IDs; no timeout increase, test disabling or threshold reduction.
4. Retests: resolved cases end in passing verification. Full suite passed; subsequent title-only changes passed the affected browser scenarios again.
5. Escalations: no pending product decisions; the owner GitHub setting remains tracked under the repository override, without ClickUp or Slack.
6. Manual verification: TC-043 passed in the named Nightly build. The broader release browser matrix remains later work.
7. Audit trail: no case or attempt removed; no retraction hidden.
8. Attempt advisories: TC-001 has four historical bootstrap failures; TC-033 has three historical setup/test-harness failures. Both are resolved and passed regression checks.
9. Process improvements: keep async component tests on real timers unless testing timing; await routed responses before teardown; inspect native-browser title/announcer state before closeout. No QA skill files were changed.

Verdict: M1 implementation and scoped local verification complete; stop for owner review before M2. Final task CI must be green before handing off.
