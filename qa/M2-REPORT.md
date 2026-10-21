# M2 QA report — Voice loop

Implementation and automated verification for T-18–T-23 are complete. M2 is not fully verified: T-21 remains blocked on physical speech checks TC-063 and TC-064. Stop at this milestone boundary before M3.

## Verification

273 unit/component tests and 33 Chromium E2E tests pass. The five required voice specs pass twice consecutively (14 tests each). Lint, typecheck and production build pass; coverage is 98.85% lines, 91.77% branches and 100% functions. Local E2E uses authorised ports 3240–3243. T-22 CI passed in run 39607399315; T-23 CI is checked after pushing this commit.

The live Chrome 155.0.8059.85 text pass completed three edited answers. Voice availability and keyboard rate adjustment were observed; audible synthesis and microphone behaviour were not verified. See [browser evidence](M2-BROWSER-SUPPORT.md) and [exploration plan](M2-BROWSER-PLAN.md). D-58 stages feedback/full-report assertions until T-28/T-30.

## Resolved

| Case   | Title                                                 | Current result                              |
| ------ | ----------------------------------------------------- | ------------------------------------------- |
| TC-046 | Feature detection                                     | Passed; evidence in the append-only ledger. |
| TC-047 | Microphone permission and cleanup                     | Passed; evidence in the append-only ledger. |
| TC-048 | Setup capability states                               | Passed; evidence in the append-only ledger. |
| TC-049 | Transcript rebuilding and capping                     | Passed; evidence in the append-only ledger. |
| TC-050 | Recorder starts and restarts                          | Passed; evidence in the append-only ledger. |
| TC-051 | Recorder error mapping                                | Passed; evidence in the append-only ledger. |
| TC-052 | Stop grace and instance cleanup                       | Passed; evidence in the append-only ledger. |
| TC-053 | Voice loading, English ordering and saved selection   | Passed; evidence in the append-only ledger. |
| TC-054 | Speech chunks, sequencing, cancellation and captions  | Passed; evidence in the append-only ledger. |
| TC-055 | Voice picker and preview controls                     | Passed; evidence in the append-only ledger. |
| TC-056 | Three-question voice flow                             | Passed; evidence in the append-only ledger. |
| TC-057 | Think, answer and character limits                    | Passed; evidence in the append-only ledger. |
| TC-058 | Speech-error recovery UI                              | Passed; evidence in the append-only ledger. |
| TC-059 | Visibility and offline speech handling                | Passed; evidence in the append-only ledger. |
| TC-060 | Type instead preserves transcript and session mode    | Passed; evidence in the append-only ledger. |
| TC-061 | Voice delivery timing, raw pace and edited word count | Passed; evidence in the append-only ledger. |
| TC-062 | Pause ordering and thresholds                         | Passed; evidence in the append-only ledger. |
| TC-065 | Current Web Speech support evidence                   | Passed; evidence in the append-only ledger. |

## Pending decision

None.

## Manual test required

| Case   | Title                                               | Current result                                      |
| ------ | --------------------------------------------------- | --------------------------------------------------- |
| TC-063 | Physical desktop Chrome three-question voice pass   | Not completed; owner follow-up in docs/PROGRESS.md. |
| TC-064 | Physical browser assumptions A-14, A-15, A-20, A-25 | Not completed; owner follow-up in docs/PROGRESS.md. |

All case histories are in [test-results.json](test-results.json); [PROGRESS.md](../docs/PROGRESS.md) replaces external tickets under AGENTS.md.

## Requirement coverage

| References                                | Cases  | Result                         |
| ----------------------------------------- | ------ | ------------------------------ |
| FR-54; UT-20                              | TC-046 | Verified within the case scope |
| FR-07; UT-20, CT-01, E2E-03               | TC-047 | Verified within the case scope |
| FR-07, FR-54; CT-01, E2E-03               | TC-048 | Verified within the case scope |
| FR-11, FR-15; UT-17                       | TC-049 | Verified within the case scope |
| FR-11, FR-15; UT-16                       | TC-050 | Verified within the case scope |
| FR-15; UT-16                              | TC-051 | Verified within the case scope |
| FR-11, NFR-14; UT-16                      | TC-052 | Verified within the case scope |
| FR-06; UT-19                              | TC-053 | Verified within the case scope |
| FR-09; UT-19                              | TC-054 | Verified within the case scope |
| FR-04; FR-06; CT-02; E2E-02               | TC-055 | Verified within the case scope |
| FR-09–FR-13; E2E-06                       | TC-056 | Verified within the case scope |
| FR-10; FR-11; FR-14; E2E-07               | TC-057 | Verified within the case scope |
| FR-15; E2E-08                             | TC-058 | Verified within the case scope |
| FR-16; FR-55; E2E-09                      | TC-059 | Verified within the case scope |
| FR-12; E2E-10                             | TC-060 | Verified within the case scope |
| FR-09–FR-16; T-21; A-14; A-15; A-20; A-25 | TC-063 | Not physically verified        |
| FR-09–FR-16; T-21; A-14; A-15; A-20; A-25 | TC-064 | Not physically verified        |
| FR-24; UT-06                              | TC-061 | Verified within the case scope |
| FR-24; UT-07                              | TC-062 | Verified within the case scope |
| FR-54; A-11; A-13; A-21                   | TC-065 | Verified within the case scope |

FR-09–FR-16 are partially verified overall: automated paths pass, while TC-063/TC-064 require physical desktop/mobile speech checks. FR-24 metric vectors pass; real recognition timing accuracy is not certified. Later feedback, persistence and full-report criteria are outside M2 under the implementation plan and D-58.

## Regressions, audit trail and root causes

No M2 case has regression_of set. T-21 exposed text-flow regressions in TC-040/TC-041; their append-only histories record fixes and passing retests. No cases were retracted or removed. TC-065’s automation flag was corrected because it is documentation inspection, with the correction recorded in its passing attempt.

The voice-clock-lifecycle group contains TC-056–TC-060 (five cases), all resolved. A production render loop from an unstable default clock callback and frozen-clock test sequencing were fixed and retested.

## Milestone review

1. Ledger integrity: PASS from check-qa-ledger.sh (65 cases); no structural or history violations.
2. Coverage: all 20 designed cases have ledger entries; 18 resolved, two manual-required. Requirement coverage above preserves the physical gaps.
3. Automation: all 17 automatable cases have unit/component or Playwright coverage. TC-065 is source inspection; TC-063/TC-064 require hardware.
4. Retesting: resolved failures have subsequent passing attempts, including the final T-23 lint correction and two consecutive browser runs.
5. Escalations: TC-063/TC-064 are recorded for the owner in PROGRESS.md, as required by the repository override. No pending decisions.
6. Manual completion: needs attention. Physical Chrome three-question speech, Safari/Edge/Android/iOS and A-14/A-15/A-20/A-25 remain unverified.
7. Audit trail: preserved; no n/a entries or deleted attempt histories.
8. Attempts advisory: historical TC-001, TC-033, TC-055 and TC-057 repeat failures are resolved; no current unresolved three-attempt product failure.
9. Agent improvement: keep hook callback defaults stable through production bundling; pause browser clocks before navigation and wait for rendered state before advancing timers; finish formatting before lint. These are workflow improvements, not new product bugs.

M2 is ready for owner review, not unconditional closure. M3 has not started.
