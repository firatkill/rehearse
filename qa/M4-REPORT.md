# M4 QA report — Local storage, history, import and export

Date: 2026-10-21. Scope: T-32–T-35.

Implementation and automated regression checks are complete: ten resolved cases, one manual check and no pending decisions. One physical voice-reload acceptance check remains outstanding. Stop before M5/T-36.

## Verification

- 508 unit/component tests and 53 Chromium E2E tests passed.
- Coverage: 97.95% lines, 91.68% branches, 98.63% functions; storage line coverage 96.58%. All configured thresholds passed.
- Production build and typecheck passed. Final lint, formatting and ledger integrity checks passed.
- A-18 verified and recorded in D-67: compound keys, versionchange, blocked upgrades and late-open cleanup work with the pinned fake-indexeddb.
- D-68 records owner approval for per-session import validation. Valid bundles import atomically; invalid bundles are counted independently. No new dependencies or external resources were added.
- No live model, Upstash or speech service was used by tests.

## Case coverage

| Case   | Behaviour                              | Requirement / test reference    | Result          |
| ------ | -------------------------------------- | ------------------------------- | --------------- |
| TC-091 | IndexedDB lifecycle                    | FR-34; UT-12                    | Passed          |
| TC-092 | Repository parity                      | FR-34; UT-13                    | Passed          |
| TC-093 | Upgrade safety                         | FR-34; D-20; UT-14              | Passed          |
| TC-094 | Storage selection and fallback         | FR-39; UT-12; E2E-23            | Passed          |
| TC-095 | Checkpoint reload recovery             | FR-35; E2E-16                   | Passed          |
| TC-096 | Write failures and persistence request | FR-35; FR-39; NFR-14; TRD §11.3 | Passed          |
| TC-097 | History list and navigation            | FR-36; CT-08; E2E-17            | Passed          |
| TC-098 | Confirmed deletion                     | FR-38; CT-08; E2E-17            | Passed          |
| TC-099 | Portable export and import             | FR-37; UT-15; E2E-18            | Passed          |
| TC-100 | Import validation and size budget      | FR-37; NFR-18; UT-15; E2E-18    | Passed          |
| TC-101 | Physical voice reload                  | FR-35; T-33 manual acceptance   | Manual required |

The PRD uses FR/NFR references rather than numbered acceptance criteria. All M4 cases TC-091–TC-101 have a ledger entry. The ten automated cases map to test source; TC-101 is explicitly manual. FR-35 has automated coverage but remains partially verified overall until the real microphone reload check passes.

## Pending decisions

None. Owner-approved D-68 resolves the import validation conflict; previously settled decisions were not reopened.

## Manual test required

TC-101: in Chrome with a real microphone, reload during voice recording after a draft save and verify that the spoken answer opens in review with the restored notice. This was not performed. Owner follow-up is recorded in [PROGRESS.md](../docs/PROGRESS.md) and [the ledger](test-results.json).

Inherited checks remain outstanding: TC-063/TC-064 physical speech/browser checks; TC-088 live model access/temperature; TC-089 live feedback and token-size measurements; TC-090 live sample generation before T-45. D-64 defers live eval until T-37. Automated mocks do not satisfy these checks.

## Findings and fixes

- Recovery restored the review phase without updating the answer record’s notice. The reducer now restores the answer status and notice, with a unit regression and browser reload checks.
- A memory fallback’s delete-all originally left earlier IndexedDB data behind. Both repository paths now remove the backing database and owned preferences; the regression verifies prior durable data followed by fallback and deletion.
- Storage startup is limited to setup, history and session routes. The sample page retains its no-IndexedDB/no-API contract, asserted in the browser.
- Existing memory-specific component tests stalled because their fully frozen timers also froze IndexedDB startup. They now explicitly select the memory backend; dedicated lifecycle/contract tests and browser tests cover IndexedDB.
- Browser fixture corrections advanced the mocked reader before asserting thinking and selected a history cell by its accessible name instead of including its hidden mobile label. No timeout or expected result was weakened.
- Build/lint corrections covered callback typing, callback state tracking, asynchronous history loading, test receiver typing and a ledger formatting race. All failures and retests remain in the append-only log.

## Milestone review

| Review item            | Verdict                                                                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger integrity       | Pass: schema/status checks and append-only history passed; no cases or attempts removed.                                                                                                                                                 |
| Designed-case coverage | Pass: TC-091–TC-101 all present.                                                                                                                                                                                                         |
| Automation             | Pass: ten automated cases map to spec-derived tests; physical speech is not claimed.                                                                                                                                                     |
| Retesting              | Pass: targeted fixes and final full regression passed.                                                                                                                                                                                   |
| Escalations            | Pass under repository override: owner follow-up in PROGRESS.md; no ClickUp or Slack.                                                                                                                                                     |
| Manual completion      | Needs attention: TC-101 and inherited physical/live checks remain outstanding.                                                                                                                                                           |
| Audit trail            | Failures and fixes retained; no case retracted or test disabled.                                                                                                                                                                         |
| Attempts advisory      | Historical repeated failures are resolved; no unresolved product defect remains. The initial final ledger check identified a missing passing lint entry for the scaffolding case; the verified result was appended and the audit passed. |
| Agent improvement      | Select test storage backends explicitly; use accessible selectors; check deletion after fallback; finish ledger edits before formatting; run heavy checks sequentially. No plugin changes required.                                      |

Final acceptance remains conditional on the named manual check. Stop before M5/T-36.
