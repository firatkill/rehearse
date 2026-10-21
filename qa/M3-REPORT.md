# M3 QA report — Feedback, rubric and report

Date: 2026-10-21. Scope: T-24–T-31.

Implementation and automated checks are complete: 22 resolved cases, 3 manual checks outstanding, 0 pending decisions. This is not unconditional milestone acceptance: owner live checks remain. Stop before M4.

## Verification

- 448 unit/component tests and 44 Chromium E2E tests passed.
- Coverage: 98.79% lines, 91.63% branches, 100% functions; all configured thresholds passed.
- Typecheck and production build passed. Final lint, formatting and ledger integrity checks passed.
- Sample validation with `--allow-mock` passed; strict validation correctly rejected the mock artifact. The sample page made zero API calls.
- Text and mocked-voice sessions reached scored reports; error recovery, report tables/chart, Markdown download and print restoration passed.
- No real model, Upstash or speech service was used in tests. D-64 defers live evaluation until T-37.
- T-30 CI passed: https://github.com/firatkill/rehearse/actions/runs/39629175254. T-31 CI passed all five jobs: https://github.com/firatkill/rehearse/actions/runs/39631383645.

## Resolved

| Case   | Title                                  | Requirement / test reference        | Current result                                |
| ------ | -------------------------------------- | ----------------------------------- | --------------------------------------------- |
| TC-066 | Token cost calculation                 | FR-45; UT-29                        | Passed; [attempt history](test-results.json). |
| TC-067 | Deterministic mock feedback            | FR-51; UT-39                        | Passed; [attempt history](test-results.json). |
| TC-068 | Mock failure triggers and cancellation | FR-51; UT-39                        | Passed; [attempt history](test-results.json). |
| TC-069 | Mock summary                           | FR-51; UT-39                        | Passed; [attempt history](test-results.json). |
| TC-070 | OpenAI adapter contract                | FR-45; FR-51; T-24; A-10            | Passed; [attempt history](test-results.json). |
| TC-071 | Untrusted-text sanitization            | FR-19; FR-23; UT-21                 | Passed; [attempt history](test-results.json). |
| TC-072 | Exact prompts and rubric               | FR-19; FR-23; UT-22                 | Passed; [attempt history](test-results.json). |
| TC-073 | Feedback normalization                 | FR-20–FR-23; UT-23                  | Passed; [attempt history](test-results.json). |
| TC-074 | Quoted evidence verification           | FR-20; UT-24                        | Passed; [attempt history](test-results.json). |
| TC-075 | Feedback retries and deadline          | FR-19; UT-25                        | Passed; [attempt history](test-results.json). |
| TC-076 | Feedback API boundaries                | FR-19; FR-40–FR-45; FR-56; UT-33    | Passed; [attempt history](test-results.json). |
| TC-077 | Feedback card                          | FR-20–FR-22; CT-03                  | Passed; [attempt history](test-results.json). |
| TC-078 | Safe model and visitor text            | FR-23; NFR-10; CT-09                | Passed; [attempt history](test-results.json). |
| TC-079 | Full feedback sessions                 | FR-19; FR-26; FR-27; E2E-05; E2E-06 | Passed; [attempt history](test-results.json). |
| TC-080 | Feedback errors and retry controls     | FR-26; FR-27; E2E-11                | Passed; [attempt history](test-results.json). |
| TC-081 | Report aggregates                      | FR-28–FR-30; UT-27                  | Passed; [attempt history](test-results.json). |
| TC-082 | Summary generation                     | FR-29; UT-26                        | Passed; [attempt history](test-results.json). |
| TC-083 | Summary API                            | FR-29; FR-40–FR-45; UT-34           | Passed; [attempt history](test-results.json). |
| TC-084 | Report states and chart                | FR-28–FR-31; CT-07; E2E-19          | Passed; [attempt history](test-results.json). |
| TC-085 | Summary retry and fallback             | FR-29; CT-07; E2E-20                | Passed; [attempt history](test-results.json). |
| TC-086 | Markdown export and print              | FR-32; UT-28; E2E-19                | Passed; [attempt history](test-results.json). |
| TC-087 | Precomputed sample report              | FR-33; UT-40; E2E-21                | Passed; [attempt history](test-results.json). |

## Pending decision

None. Approved D-64/D-65 staging and mock copy remain in force; no previously decided choice was reopened.

## Manual test required

| Case   | Remaining check                                          | Owner follow-up                                                             |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| TC-088 | Live model verification — not performed                  | [Progress file](../docs/PROGRESS.md); [attempt history](test-results.json). |
| TC-089 | Live feedback and token-size measurement — not performed | [Progress file](../docs/PROGRESS.md); [attempt history](test-results.json). |
| TC-090 | Live sample provenance — not performed                   | [Progress file](../docs/PROGRESS.md); [attempt history](test-results.json). |

TC-088 needs the owner’s live model/temperature check. TC-089 needs a live feedback response and token-size comparison with TRD §23.2. TC-090 needs live sample generation and removal of the temporary CI flag before T-45. The mock artifact does not satisfy live provenance.

Inherited physical speech checks TC-063/TC-064 remain outstanding: real microphone/TTS and the specified Chrome/Edge/Safari/Android/iOS behaviour. Automated speech mocks do not substitute for them.

## Requirement coverage

The PRD uses FR references rather than numbered AC-N identifiers. The table above maps every automated M3 case to its requirements and normative test IDs. FR-19 and FR-33 are only partially verified overall because their owner live checks remain outstanding; mock contracts and browser behaviour are verified. The M3 feedback/report behaviours are mapped in the table. Delivery-metric algorithms were verified in M2 and retained in the final regression run. Model access, live quality and token pricing in use are not claimed.

## Regressions and root causes

No unresolved product regression remains. The report transcript locator was scoped to its disclosure after verified evidence introduced a legitimate second copy of the sentence; the visibility assertion was retained. The unchanged feedback-card test timed out under machine load, then passed alone and in the final full suite. Earlier full-browser contention was addressed by running heavy checks sequentially. No timeout, coverage threshold or assertion was weakened.

## Audit trail

No M3 case was retracted or removed. All failures and retests remain in the append-only ledger. No M3 case has an unresolved root-cause group. External task links are intentionally absent under the repository override; owner follow-ups are in PROGRESS.md.

## Milestone review

| Review item            | Verdict                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger integrity       | Pass: schema, status vocabulary, final passing attempts and append-only history checked.                                                                                                                                                  |
| Designed-case coverage | Pass: every case TC-066–TC-090 has a ledger entry; none missing.                                                                                                                                                                          |
| Automation             | Pass: all 22 resolved M3 cases map to test source; three live checks are explicitly non-automatable here.                                                                                                                                 |
| Retesting              | Pass: every resolved case ends in an actual passing run; failures remain in the history.                                                                                                                                                  |
| Escalations            | Pass under the repository override: manual owner follow-ups are in PROGRESS.md, with no ClickUp or Slack.                                                                                                                                 |
| Manual completion      | Needs attention: TC-088, TC-089 and TC-090 have not been performed. Inherited TC-063/TC-064 also remain open.                                                                                                                             |
| Audit trail            | Pass: no M3 case or attempt removed; no retracted cases.                                                                                                                                                                                  |
| Attempts advisory      | Earlier-milestone cases with repeated failures are resolved; no unresolved M3 cluster. Machine contention and selector ambiguity are documented above.                                                                                    |
| Agent improvement      | Run heavy checks sequentially; finish fixture/artifact edits before formatting; inspect injected interfaces before writing fakes; scope repeated transcript/evidence assertions to their intended region. No plugin changes are required. |

Verdict: implementation and automated M3 QA are ready for owner review. Full live acceptance remains blocked by the named manual checks. Stop before M4/T-32.
