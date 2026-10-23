# M0 Setup test cases

Cases derive from the approved PRD, TRD and T-01–T-05 acceptance criteria. Tooling checks are command-based; behaviour tests use the prescribed unit, component and E2E layout. All cases are automatable.

| TC ID  | Requirement              | TRD test / acceptance    | Title                                                 | Priority | Automatable |
| ------ | ------------------------ | ------------------------ | ----------------------------------------------------- | -------- | ----------- |
| TC-001 | T-01; D-01; NFR-17       | T-01 acceptance          | Pinned tooling installs, lints, typechecks and builds | High     | yes         |
| TC-002 | T-01; NFR-17             | T-01 acceptance          | CI skeleton passes on GitHub                          | High     | yes         |
| TC-003 | FR-44; FR-51             | UT-30                    | Environment defaults and conditional requirements     | Critical | yes         |
| TC-004 | FR-51; NFR-13            | UT-30                    | Production rejects development backends               | Critical | yes         |
| TC-005 | NFR-13                   | UT-30                    | Secrets differ and validation does not expose values  | Critical | yes         |
| TC-006 | FR-51                    | UT-30                    | Example variable inventory matches TRD                | High     | yes         |
| TC-007 | NFR-13                   | T-03 request tests       | Request content type, size and origin checks          | Critical | yes         |
| TC-008 | FR-56; NFR-11            | T-03 logger tests        | Logger redacts sensitive fields                       | Critical | yes         |
| TC-009 | NFR-13; D-23; D-39       | E2E-27 / T-03 acceptance | Per-request CSP nonce and security headers            | Critical | yes         |
| TC-010 | NFR-17; FR-51            | T-04 acceptance          | Offline test projects and four E2E servers            | Critical | yes         |
| TC-011 | NFR-17                   | T-04 acceptance          | Full CI skeleton passes                               | High     | yes         |
| TC-012 | NFR-08                   | CT-06                    | Announcer suppresses duplicates and limits queue      | High     | yes         |
| TC-013 | FR-53                    | E2E-26 / T-05 acceptance | Theme persists across reload                          | High     | yes         |
| TC-014 | NFR-08; NFR-09; PRD §9.1 | T-05 acceptance          | Layout shell and keyboard skip link                   | High     | yes         |
| TC-015 | PRD §9.2; PRD §9.13      | T-05 acceptance          | Banners and error-page copy                           | High     | yes         |

## TC-001: Pinned tooling installs, lints, typechecks and builds

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Run frozen install, lint, typecheck and build; inspect direct version pins and react-server import.

Expected: All commands pass; versions have no ranges; server-only resolves under react-server.

## TC-002: CI skeleton passes on GitHub

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Push T-01 and inspect lint, typecheck and build jobs.

Expected: All three jobs pass on the pushed revision.

## TC-003: Environment defaults and conditional requirements

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Parse mock example and live/upstash variants with missing required values.

Expected: Example parses; live and Upstash require their documented variables.

## TC-004: Production rejects development backends

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Parse production with mock or memory, then live/upstash.

Expected: Mock and memory are rejected in production.

## TC-005: Secrets differ and validation does not expose values

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Set identical secrets and invalid sensitive values; inspect errors.

Expected: Invalid names are listed without values; identical secrets fail.

## TC-006: Example variable inventory matches TRD

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Compare example variable names including platform comments to TRD §5 fixture.

Expected: Every documented variable is present and example alone parses.

## TC-007: Request content type, size and origin checks

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Submit non-JSON, oversized declared/actual bodies, invalid JSON and forbidden origins.

Expected: Return documented 415, 413, 400 and 403 codes; valid request succeeds.

## TC-008: Logger redacts sensitive fields

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Capture logger output with transcript, prompt, output, token and authorization fields.

Expected: Sensitive values are replaced with [Redacted].

## TC-009: Per-request CSP nonce and security headers

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Request production server twice over HTTP; inspect headers and script nonce.

Expected: Nonces differ and reach framework scripts; microphone=(self); HTTP omits upgrade-insecure-requests.

## TC-010: Offline test projects and four E2E servers

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Run both Vitest projects, coverage and four-port health smoke.

Expected: Both projects pass with external fetch guard; each server health returns 200.

## TC-011: Full CI skeleton passes

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Inspect lint, typecheck, unit, E2E and build jobs after push.

Expected: All five jobs pass on pushed revision.

## TC-012: Announcer suppresses duplicates and limits queue

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Use fake timers to send repeated and queued messages.

Expected: Duplicates within 1 second suppressed; minimum interval 1 second; queue at most 2; repeated message can be announced after clear.

## TC-013: Theme persists across reload

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Toggle light/dark theme then reload; inspect document theme and button name.

Expected: Chosen theme persists and accessible name offers opposite theme.

## TC-014: Layout shell and keyboard skip link

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Inspect header/footer at 360 and 1024 px; activate first focusable skip link.

Expected: Exact navigation/footer copy, main target focus, wrapping navigation and no horizontal overflow.

## TC-015: Banners and error-page copy

Preconditions: the corresponding implementation task is available; tests use mock LLM and memory rate limiting.

1. Render each banner condition and unknown route; inspect error boundary rendering.

Expected: Exact specified copy and accessible names; banners appear in specified order.

## M1 Question bank, setup and text-mode room

All cases use mock LLM, memory rate limiting and fake clocks/providers unless the case explicitly compares the fake Upstash adapter. No live provider calls.

| TC ID  | PRD / TRD reference                 | Title                                              | Priority | Automatable | Expected result                                                                                                    |
| ------ | ----------------------------------- | -------------------------------------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| TC-016 | FR-01, FR-03; UT-03                 | Question schema rejects invalid records            | High     | yes         | Only schema-valid questions parse.                                                                                 |
| TC-017 | FR-01, FR-03; UT-03                 | Bank validator enforces integrity                  | High     | yes         | Invalid fixtures fail with violations; normative examples pass incomplete mode.                                    |
| TC-018 | FR-02, FR-03; UT-03                 | Complete bank meets distribution and coverage      | High     | yes         | 120 active questions; counts 50/40/30; every cell at least five; topic cap four.                                   |
| TC-019 | FR-05, NFR-16; UT-02                | Seeded PRNG has stable vectors                     | High     | yes         | Stable vectors, values in [0,1), exact permutation and invalid-seed rejection.                                     |
| TC-020 | FR-05, NFR-16; UT-01                | Selection is deterministic and balanced            | High     | yes         | Stable ids, unique ids/topics where possible, role/level eligibility, balanced types and seed sensitivity.         |
| TC-021 | FR-05; UT-01                        | Selection fallback and exhaustion                  | High     | yes         | Specified tier/topic fallback; exhausted type throws.                                                              |
| TC-022 | FR-41, FR-42; UT-09                 | Visitor identity rotates by UTC day                | High     | yes         | Header precedence holds; 32 hex id is stable within a day and changes across days/secrets.                         |
| TC-023 | FR-41, FR-42; UT-10                 | Daily limits and session TTL match across adapters | High     | yes         | Limit then deny, correct remaining/reset, independent keys and TTL reset.                                          |
| TC-024 | FR-51; UT-10                        | Limiter failures fail closed                       | High     | yes         | Each rejects with LimiterUnavailableError without allowing work.                                                   |
| TC-025 | FR-41, FR-42; UT-11                 | Quota checks consume in specified order            | High     | yes         | First denial code returned; earlier counters remain consumed, later counters untouched.                            |
| TC-026 | FR-40; UT-08                        | Signed token validates and rotates                 | High     | yes         | Valid signatures accepted, tampering and invalid shapes rejected.                                                  |
| TC-027 | FR-40; UT-08                        | Token time bounds enforced                         | High     | yes         | Expired returns TOKEN_EXPIRED; invalid time bounds return TOKEN_INVALID.                                           |
| TC-028 | FR-40, FR-44; UT-31                 | API boundaries validate contracts                  | High     | yes         | Valid bodies accepted; unsupported fields rejected according to approved contract strictness.                      |
| TC-029 | FR-40, FR-41, FR-44, FR-46; UT-32   | Start endpoint guards and feedback modes           | High     | yes         | Specified check order and error codes; readonly/practice omit token and limiter; normal token scopes selected ids. |
| TC-030 | FR-41, FR-51; UT-32                 | Start endpoint quota and outage                    | High     | yes         | Fourth returns quota/reset; outage returns LIMITER_UNAVAILABLE.                                                    |
| TC-031 | FR-47; UT-35                        | Health route is local and validated                | High     | yes         | Full TRD body without provider/limiter calls; invalid env returns safe INTERNAL_ERROR.                             |
| TC-032 | FR-34, FR-39; UT-13                 | Memory repository preserves storage contract       | High     | yes         | Ordering, updatedAt, invalid counts, cascade and deleteAll match TRD.                                              |
| TC-033 | FR-04, FR-05; CT-01, E2E-02, E2E-04 | Setup defaults validation and seeds                | High     | yes         | Exact defaults/copy, type error focus, valid seed retained and invalid seed omitted.                               |
| TC-034 | FR-44, FR-46; CT-01                 | Setup fallback panels start practice               | High     | yes         | Specified panels/copy; fallback requests feedback false and stores correct reason.                                 |
| TC-035 | FR-08–FR-18, FR-35; UT-18           | Room transitions and recovery                      | High     | yes         | Specified phases, dialogs, terminal states and restored notices.                                                   |
| TC-036 | FR-14, FR-26; UT-18                 | Room submission guards                             | High     | yes         | No forbidden submission; expiry maps to TOKEN_EXPIRED.                                                             |
| TC-037 | FR-24, FR-25; UT-04, UT-05          | Text word and filler metrics                       | High     | yes         | Exact deterministic word/filler counts and ordered breakdown.                                                      |
| TC-038 | FR-24; CT-04                        | Text delivery display                              | High     | yes         | Voice-only measures remain null; exact not-measured and none-counted copy.                                         |
| TC-039 | FR-12–FR-14; CT-05                  | Review validation and editing                      | High     | yes         | Exact warnings, word/character counts and enabled actions; raw transcript remains unchanged.                       |
| TC-040 | FR-08, FR-10, FR-12–FR-18; E2E-05   | Readonly text session completes                    | High     | yes         | Answers retained in memory and placeholder report lists them; focus/announcements follow spec.                     |
| TC-041 | FR-17, FR-18; E2E-05                | Skip and end dialogs preserve terminal semantics   | High     | yes         | Cancel preserves work; skipped status retained; zero-answer end deletes and navigates to setup.                    |
| TC-042 | PRD 9.6; E2E-29                     | Unknown session shows recovery page                | High     | yes         | Session not found copy and start link.                                                                             |
| TC-043 | FR-12; T-17 manual acceptance       | Firefox text session completes                     | High     | no          | Session completes without speech or real external services.                                                        |

### TC-016: Question schema rejects invalid records

Reference: FR-01, FR-03; UT-03. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Parse valid examples and mutations for duplicate roles/levels, wrong prefix, unknown keys and overlong prompts.

Expected: Only schema-valid questions parse.

### TC-017: Bank validator enforces integrity

Reference: FR-01, FR-03; UT-03. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Validate duplicate ids, unsorted files, excessive topic counts, markup and manifest/file mismatches.

Expected: Invalid fixtures fail with violations; normative examples pass incomplete mode.

### TC-018: Complete bank meets distribution and coverage

Reference: FR-02, FR-03; UT-03. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Validate the completed bank and enumerate every role/type/level cell.

Expected: 120 active questions; counts 50/40/30; every cell at least five; topic cap four.

### TC-019: Seeded PRNG has stable vectors

Reference: FR-05, NFR-16; UT-02. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Run fixed seeds, shuffle permutations and invalid seed inputs.

Expected: Stable vectors, values in [0,1), exact permutation and invalid-seed rejection.

### TC-020: Selection is deterministic and balanced

Reference: FR-05, NFR-16; UT-01. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Run fixed fixture inputs and exhaustive eligible cells/type subsets/lengths/seeds on the real bank.

Expected: Stable ids, unique ids/topics where possible, role/level eligibility, balanced types and seed sensitivity.

### TC-021: Selection fallback and exhaustion

Reference: FR-05; UT-01. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Select from sparse tier pools and an exhausted bank.

Expected: Specified tier/topic fallback; exhausted type throws.

### TC-022: Visitor identity rotates by UTC day

Reference: FR-41, FR-42; UT-09. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Vary IP headers, UTC day and secret.

Expected: Header precedence holds; 32 hex id is stable within a day and changes across days/secrets.

### TC-023: Daily limits and session TTL match across adapters

Reference: FR-41, FR-42; UT-10. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Run shared fake-clock contract against memory and fake Upstash.

Expected: Limit then deny, correct remaining/reset, independent keys and TTL reset.

### TC-024: Limiter failures fail closed

Reference: FR-51; UT-10. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Inject timeout reason, network error and slow pipeline.

Expected: Each rejects with LimiterUnavailableError without allowing work.

### TC-025: Quota checks consume in specified order

Reference: FR-41, FR-42; UT-11. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Exercise each denial stage for start/feedback/summary.

Expected: First denial code returned; earlier counters remain consumed, later counters untouched.

### TC-026: Signed token validates and rotates

Reference: FR-40; UT-08. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Round-trip current and previous secrets; mutate prefix/parts/signature/payload/length.

Expected: Valid signatures accepted, tampering and invalid shapes rejected.

### TC-027: Token time bounds enforced

Reference: FR-40; UT-08. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Test expiry, future issue time and excessive lifetime with injected time.

Expected: Expired returns TOKEN_EXPIRED; invalid time bounds return TOKEN_INVALID.

### TC-028: API boundaries validate contracts

Reference: FR-40, FR-44; UT-31. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Parse TRD examples and unknown-key mutations.

Expected: Valid bodies accepted; unsupported fields rejected according to approved contract strictness.

### TC-029: Start endpoint guards and feedback modes

Reference: FR-40, FR-41, FR-44, FR-46; UT-32. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Send invalid content/size/JSON/origin/schema; off/readonly/practice/normal requests.

Expected: Specified check order and error codes; readonly/practice omit token and limiter; normal token scopes selected ids.

### TC-030: Start endpoint quota and outage

Reference: FR-41, FR-51; UT-32. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Start four normal sessions under limit three; inject failing limiter.

Expected: Fourth returns quota/reset; outage returns LIMITER_UNAVAILABLE.

### TC-031: Health route is local and validated

Reference: FR-47; UT-35. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Read health with valid and invalid environment.

Expected: Full TRD body without provider/limiter calls; invalid env returns safe INTERNAL_ERROR.

### TC-032: Memory repository preserves storage contract

Reference: FR-34, FR-39; UT-13. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Create/read/update/list sessions and answers, corrupt records and delete.

Expected: Ordering, updatedAt, invalid counts, cascade and deleteAll match TRD.

### TC-033: Setup defaults validation and seeds

Reference: FR-04, FR-05; CT-01, E2E-02, E2E-04. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Render setup, clear types, inspect seed valid/invalid, submit text mode.

Expected: Exact defaults/copy, type error focus, valid seed retained and invalid seed omitted.

### TC-034: Setup fallback panels start practice

Reference: FR-44, FR-46; CT-01. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Inject quota/limiter/read-only/off results and activate available actions.

Expected: Specified panels/copy; fallback requests feedback false and stores correct reason.

### TC-035: Room transitions and recovery

Reference: FR-08–FR-18, FR-35; UT-18. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Exercise every transition and recovery-table row with fixture records.

Expected: Specified phases, dialogs, terminal states and restored notices.

### TC-036: Room submission guards

Reference: FR-14, FR-26; UT-18. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Try submission offline, with empty transcript, disabled feedback or expired token.

Expected: No forbidden submission; expiry maps to TOKEN_EXPIRED.

### TC-037: Text word and filler metrics

Reference: FR-24, FR-25; UT-04, UT-05. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Run TRD vectors including apostrophes/hyphens, filler boundaries and enabled list.

Expected: Exact deterministic word/filler counts and ordered breakdown.

### TC-038: Text delivery display

Reference: FR-24; CT-04. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Render text-mode metrics with zero and nonzero fillers.

Expected: Voice-only measures remain null; exact not-measured and none-counted copy.

### TC-039: Review validation and editing

Reference: FR-12–FR-14; CT-05. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Edit empty, short, capped and valid text, with feedback enabled/disabled.

Expected: Exact warnings, word/character counts and enabled actions; raw transcript remains unchanged.

### TC-040: Readonly text session completes

Reference: FR-08, FR-10, FR-12–FR-18; E2E-05. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. On port 3201 set up three text questions; intro, think, answer, review, save and next to report.

Expected: Answers retained in memory and placeholder report lists them; focus/announcements follow spec.

### TC-041: Skip and end dialogs preserve terminal semantics

Reference: FR-17, FR-18; E2E-05. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Cancel and confirm skip/end with zero and nonzero saved answers.

Expected: Cancel preserves work; skipped status retained; zero-answer end deletes and navigates to setup.

### TC-042: Unknown session shows recovery page

Reference: PRD 9.6; E2E-29. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Open an unknown session id.

Expected: Session not found copy and start link.

### TC-043: Firefox text session completes

Reference: FR-12; T-17 manual acceptance. Preconditions: corresponding task implemented; isolated fixtures and test backends.

1. Complete three text questions in Firefox with mock LLM and memory limiter.

Expected: Session completes without speech or real external services.

### TC-044: Repository exchange contract (T-13 prerequisite)

Reference: FR-37; TRD §7.5 and §7.7; UT-15 repository subset. Milestone: M1 Question bank, setup and text-mode room. Priority: High. Automatable: yes. Export/import controls and complete UT-15 remain T-35.

Preconditions: an in-memory repository with a valid session and answer.

1. Export the records, then import into a fresh repository twice.
2. Try oversized, malformed, invalid-shape and newer-version files.

Expected: Export strips tokens; import marks origin and disables feedback for resumable sessions; duplicate ids are skipped; invalid files are rejected.

### TC-045: Safe text prerequisite for setup and room

Reference: NFR-13; TRD §19.5; CT-09 SafeText subset. Milestone: M1 Question bank, setup and text-mode room. Priority: High. Automatable: yes. SafeMarkdown remains T-40.

1. Render visitor text containing literal HTML, Markdown punctuation and a bracketed placeholder.

Expected: Text remains literal, no HTML element or link is created, and the placeholder receives the prescribed span.

### T-17 execution detail

TC-040 also verifies TRD §11.3 draft writes at 2 seconds, edit debouncing at 500 ms, and memory fallback after a failed write. TC-039 checks all six specified notices and the TRD §11.2 duration wording. TC-043 is a live native-browser pass, executed in the existing Firefox Nightly 157.0 build; this does not claim coverage of stock Firefox release or real speech. The report remains the T-17 placeholder until T-30.

## M2 Voice — T-18–T-23

All automated cases use mocked speech/LLM and the memory limiter. Physical microphone checks are separate manual cases.

| TC     | Reference                            | Behaviour                                    | Priority | Automatable | Expected                                                                                                                                        |
| ------ | ------------------------------------ | -------------------------------------------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-046 | FR-54; UT-20                         | Feature detection                            | High     | yes         | Constructor precedence and all five notices match TRD 9.1; recognition requires a secure context.                                               |
| TC-047 | FR-07; UT-20                         | Microphone permission and cleanup            | High     | yes         | Every granted track stops immediately; permission, device and other errors map to PRD 9.4 copy.                                                 |
| TC-048 | FR-07, FR-54; CT-01, E2E-03          | Setup capability states                      | High     | yes         | Neutral server placeholder; unsupported Voice disabled with description and Text selected; notices exact.                                       |
| TC-049 | FR-11, FR-15; UT-17                  | Transcript rebuilding and capping            | High     | yes         | No repeated results appended; interim retained on commit; single-space joins and specified word boundary cap.                                   |
| TC-050 | FR-11, FR-15; UT-16                  | Recorder starts and restarts                 | High     | yes         | New run per restart; productive runs reset the consecutive-empty limit; max empty runs stop.                                                    |
| TC-051 | FR-15; UT-16                         | Recorder error mapping                       | High     | yes         | Each outcome matches TRD 9.4/9.6; available transcript survives errors.                                                                         |
| TC-052 | FR-11, NFR-14; UT-16                 | Stop grace and instance cleanup              | High     | yes         | Late final text retained; grace aborts; stale events ignored; timers and microphone instances cleaned up.                                       |
| TC-053 | FR-04, FR-06; UT-19                  | English voice loading and selection          | High     | yes         | English voices sorted by spec; default fallback and missing-voice indication; late events resolve once.                                         |
| TC-054 | FR-06, FR-09; UT-19                  | Chunked synthesis and cancellation           | High     | yes         | Exact chunk algorithm, ordered utterances, safety timeout and cancellation; silent prime before async work.                                     |
| TC-055 | FR-04, FR-06; CT-02, E2E-02          | Voice picker and preview                     | High     | yes         | Exact labels, range bounds and preview text; no voices disables read-aloud.                                                                     |
| TC-056 | FR-09–FR-13; E2E-06                  | Three-question voice flow                    | High     | yes         | No recognition/synthesis overlap; raw/edited transcripts retained and report reached. D-58 stages feedback/full-report assertions in T-28/T-30. |
| TC-057 | FR-10, FR-11, FR-14; E2E-07          | Think, answer and character limits           | High     | yes         | Recording starts on timer expiry; stops at configured limit/cap; notices and threshold announcements exact.                                     |
| TC-058 | FR-15; E2E-08                        | Speech-error recovery UI                     | High     | yes         | Correct copy/focus; partial words kept; Type instead remains usable.                                                                            |
| TC-059 | FR-16, FR-55; E2E-09                 | Visibility and offline speech handling       | High     | yes         | Replay offered for interrupted TTS; thinking paused; recording stops; offline start uses text for this answer only; no automatic restart.       |
| TC-060 | FR-12; E2E-10                        | Type instead preserves text and session mode | High     | yes         | Partial transcript retained and rest of session uses Text; no active microphone remains.                                                        |
| TC-061 | FR-24; UT-06                         | Voice delivery metrics                       | High     | yes         | Words from edited text; pace/fillers from raw; speaking time excludes lead-in/trailing silence; pace null below 10 seconds.                     |
| TC-062 | FR-24; UT-07                         | Pause estimates                              | High     | yes         | Nulls for insufficient offsets; gaps >=3000 ms counted; longest gap correct.                                                                    |
| TC-063 | FR-09–FR-16; T-21 manual acceptance  | Desktop Chrome voice acceptance              | High     | no          | Full session completes; speech and recognition never overlap; text fallback remains available.                                                  |
| TC-064 | FR-11, FR-15; A-14, A-15, A-20, A-25 | Physical browser speech assumptions          | High     | no          | Record observed behaviour and versions; propose any required spec change before implementing it.                                                |
| TC-065 | FR-54; A-11, A-13, A-21              | Current Web Speech support evidence          | High     | no          | Dated evidence logged; no unsupported inference of manual browser success.                                                                      |

### TC-046: Feature detection

Reference: FR-54; UT-20. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Compare secure Chrome-like, Firefox-like, recognition-only, neither, insecure and storage-less fake windows.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Constructor precedence and all five notices match TRD 9.1; recognition requires a secure context.

### TC-047: Microphone permission and cleanup

Reference: FR-07; UT-20. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Provide granted streams and each specified getUserMedia exception; click Check microphone.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Every granted track stops immediately; permission, device and other errors map to PRD 9.4 copy.

### TC-048: Setup capability states

Reference: FR-07, FR-54; CT-01, E2E-03. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Mount setup under each capability combination; choose/check the microphone.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Neutral server placeholder; unsupported Voice disabled with description and Text selected; notices exact.

### TC-049: Transcript rebuilding and capping

Reference: FR-11, FR-15; UT-17. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Apply repeated complete result lists, mixed finals/interims, commit across runs, and cap overlong text.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: No repeated results appended; interim retained on commit; single-space joins and specified word boundary cap.

### TC-050: Recorder starts and restarts

Reference: FR-11, FR-15; UT-16. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Start; deliver results and END; test six empty restarts and 20 productive runs.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: New run per restart; productive runs reset the consecutive-empty limit; max empty runs stop.

### TC-051: Recorder error mapping

Reference: FR-15; UT-16. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Exercise no-speech three times, network before/after words, permission/device/unknown/aborted errors.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Each outcome matches TRD 9.4/9.6; available transcript survives errors.

### TC-052: Stop grace and instance cleanup

Reference: FR-11, NFR-14; UT-16. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Stop with a late result, END or grace expiry; deliver stale instance events and unmount.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Late final text retained; grace aborts; stale events ignored; timers and microphone instances cleaned up.

### TC-053: English voice loading and selection

Reference: FR-04, FR-06; UT-19. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Load immediate/event/timeout voices; vary language/local/default and stored URI.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: English voices sorted by spec; default fallback and missing-voice indication; late events resolve once.

### TC-054: Chunked synthesis and cancellation

Reference: FR-06, FR-09; UT-19. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Split sentences/long text; speak chunks; cancel, interrupt, error or omit end; prime in click.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Exact chunk algorithm, ordered utterances, safety timeout and cancellation; silent prime before async work.

### TC-055: Voice picker and preview

Reference: FR-04, FR-06; CT-02, E2E-02. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Inspect loading/empty/online/fallback voices; change rate and preview/stop.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Exact labels, range bounds and preview text; no voices disables read-aloud.

### TC-056: Three-question voice flow

Reference: FR-09–FR-13; E2E-06. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Use happy mocked speech, captions, thinking, interim/final results, stop, edit, save and next.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: No recognition/synthesis overlap; raw/edited transcripts retained and report reached. D-58 stages feedback/full-report assertions in T-28/T-30.

### TC-057: Think, answer and character limits

Reference: FR-10, FR-11, FR-14; E2E-07. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Advance fake time through 15-second thinking and answer limit; emit an overlong transcript.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Recording starts on timer expiry; stops at configured limit/cap; notices and threshold announcements exact.

### TC-058: Speech-error recovery UI

Reference: FR-15; E2E-08. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Run denied, no-speech, network-with-words and network-without-words scenarios; retry or type.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Correct copy/focus; partial words kept; Type instead remains usable.

### TC-059: Visibility and offline speech handling

Reference: FR-16, FR-55; E2E-09. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Hide during asking/thinking/recording; go offline during/before recording, then reconnect.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Replay offered for interrupted TTS; thinking paused; recording stops; offline start uses text for this answer only; no automatic restart.

### TC-060: Type instead preserves text and session mode

Reference: FR-12; E2E-10. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Switch during asking, thinking, recording and errors, then advance.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Partial transcript retained and rest of session uses Text; no active microphone remains.

### TC-061: Voice delivery metrics

Reference: FR-24; UT-06. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Use raw and edited transcripts with short/long result-offset spans and trailing silence.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Words from edited text; pace/fillers from raw; speaking time excludes lead-in/trailing silence; pace null below 10 seconds.

### TC-062: Pause estimates

Reference: FR-24; UT-07. Priority: High. Automatable: yes.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Use fewer than two, unsorted, duplicate, and threshold-boundary offsets.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Nulls for insufficient offsets; gaps >=3000 ms counted; longest gap correct.

### TC-063: Desktop Chrome voice acceptance

Reference: FR-09–FR-16; T-21 manual acceptance. Priority: High. Automatable: no.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Complete three voice questions using a real microphone in desktop Chrome; note version.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Full session completes; speech and recognition never overlap; text fallback remains available.

### TC-064: Physical browser speech assumptions

Reference: FR-11, FR-15; A-14, A-15, A-20, A-25. Priority: High. Automatable: no.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Run four-minute speech/restarts on Chrome, Edge and Safari; Android duplication; Safari Siri-off and gesture checks.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Record observed behaviour and versions; propose any required spec change before implementing it.

### TC-065: Current Web Speech support evidence

Reference: FR-54; A-11, A-13, A-21. Priority: High. Automatable: no. This is a source-document review (A-11/A-13/A-21), not a mocked runtime test.

Preconditions: task implemented; isolated fake windows, providers and clocks for automation; named physical browser/device for manual checks.

1. Read MDN/compat data and the Web Speech specification for support, on-device options and timestamps.
2. Check the outcome and cleanup against the referenced PRD/TRD section.

Expected: Dated evidence logged; no unsupported inference of manual browser success.

## M3 — Feedback, rubric and report (T-24–T-31)

Designed from PRD §7/§9.6–§9.8 and TRD §12, §14–§15, §17, §23, §25 before M3 code. Live acceptance and sample generation remain owner checks.

| TC     | References                          | Title                                    | Priority | Automatable | Expected result                                                                                                                                                     |
| ------ | ----------------------------------- | ---------------------------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-066 | FR-45; UT-29                        | Token cost calculation                   | High     | yes         | Use TRD §23.1 formula, clamping uncached tokens at zero.                                                                                                            |
| TC-067 | FR-51; UT-39                        | Deterministic mock feedback              | High     | yes         | Identical output; scores and flags follow TRD §15.6.                                                                                                                |
| TC-068 | FR-51; UT-39                        | Mock failure triggers and cancellation   | High     | yes         | Specified errors, invalid output and delay; no network calls.                                                                                                       |
| TC-069 | FR-51; UT-39                        | Mock summary                             | High     | yes         | Headline and next practice use computed labels; ordered notes; fixed paragraph.                                                                                     |
| TC-070 | FR-45; FR-51; T-24; A-10            | OpenAI adapter contract                  | High     | yes         | Structured output, maxRetries 0, explicit non-strict schema, configured temperature/reasoning; safe mapped errors.                                                  |
| TC-071 | FR-19; FR-23; UT-21                 | Untrusted-text sanitization              | High     | yes         | Exact normative sanitization.                                                                                                                                       |
| TC-072 | FR-19; FR-23; UT-22                 | Exact prompts and rubric                 | High     | yes         | Byte-exact copy, trusted/untrusted block order and matching versions.                                                                                               |
| TC-073 | FR-20–FR-23; UT-23                  | Feedback normalization                   | High     | yes         | TRD §15.3 rejects invalid fields and applies deterministic caps.                                                                                                    |
| TC-074 | FR-20; UT-24                        | Quoted evidence verification             | High     | yes         | Only supported whole-word evidence survives; removed count accurate.                                                                                                |
| TC-075 | FR-19; UT-25                        | Feedback retries and deadline            | High     | yes         | At most two attempts, bounded deadline, usage accumulated and exact error codes.                                                                                    |
| TC-076 | FR-19; FR-40–FR-45; FR-56; UT-33    | Feedback API boundaries                  | High     | yes         | Normative check order and error statuses, remaining calls, valid success response, TRD §20 log levels and no transcript in logs.                                    |
| TC-077 | FR-20–FR-22; CT-03                  | Feedback card                            | High     | yes         | Accessible scores, exact copy, evidence only when present, disclaimer and metadata; TRD §19.2 bars use four 12 × 6 px segments, 2 px gaps and the specified tokens. |
| TC-078 | FR-23; NFR-10; CT-09                | Safe model and visitor text              | High     | yes         | Literal text; no HTML execution; placeholders styled.                                                                                                               |
| TC-079 | FR-19; FR-26; FR-27; E2E-05; E2E-06 | Full feedback sessions                   | High     | yes         | Scored answers and retained edits reach the report, replacing D-58 staged assertions.                                                                               |
| TC-080 | FR-26; FR-27; E2E-11                | Feedback errors and retry controls       | High     | yes         | Exact copy, allowed retry actions, remaining attempts, progress text and keyboard focus; blocking error H2 is announced assertively (NFR-08; TRD §19.4).            |
| TC-081 | FR-28–FR-30; UT-27                  | Report aggregates                        | High     | yes         | Exact means, tie order, focus order, trend and delivery null handling.                                                                                              |
| TC-082 | FR-29; UT-26                        | Summary generation                       | High     | yes         | Recomputed focus ordering; missing notes null; invalid required text fails.                                                                                         |
| TC-083 | FR-29; FR-40–FR-45; UT-34           | Summary API boundaries                   | High     | yes         | Normative status, check order and validated response.                                                                                                               |
| TC-084 | FR-28–FR-32; CT-07; E2E-19          | Report states and chart                  | High     | yes         | Exact report copy and table; chart excludes unscored data and hides below two scores; visible touch targets meet 44 × 44 px (NFR-09; TRD §19.4).                    |
| TC-085 | FR-29; E2E-20                       | Summary retry and fallback               | High     | yes         | One eligible automatic call; fallback tips; retries only when permitted.                                                                                            |
| TC-086 | FR-32; UT-28; E2E-19                | Markdown export and print                | High     | yes         | Escaped deterministic Markdown and filename; details open then restore; actions hidden in print.                                                                    |
| TC-087 | FR-33; UT-40; E2E-21                | Static sample report                     | High     | yes         | Three seeded scored fictional answers, summary and valid export; no API/limiter/storage use; mock allowed only with explicit validation flag.                       |
| TC-088 | FR-19; T-24; A-01; A-02; A-03       | Live model verification                  | High     | no          | Pinned model available, accepts settings and returns valid object; published prices recorded.                                                                       |
| TC-089 | FR-19; FR-56; T-27                  | Live feedback and token-size measurement | High     | no          | Valid feedback; measured token sizes compared to TRD §23.2; update if >20% different.                                                                               |
| TC-090 | FR-33; T-31                         | Live sample provenance                   | High     | no          | Real model outputs validate without --allow-mock; no fictional output claimed as live.                                                                              |

### TC-066 — Token cost calculation

- References: FR-45; UT-29.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Call estimateCostUsd with uncached, partially cached, all-cached and zero-price usage.
- Expected: Use TRD §23.1 formula, clamping uncached tokens at zero.

### TC-067 — Deterministic mock feedback

- References: FR-51; UT-39.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Call mock twice with the same prompt; compare weak and strong examples and each heuristic boundary.
- Expected: Identical output; scores and flags follow TRD §15.6.

### TC-068 — Mock failure triggers and cancellation

- References: FR-51; UT-39.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Exercise every mock trigger, first/second invalid-once attempts, slow delay and aborted signals with fake timers.
- Expected: Specified errors, invalid output and delay; no network calls.

### TC-069 — Mock summary

- References: FR-51; UT-39.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Provide computed means and focus ids in the summary prompt.
- Expected: Headline and next practice use computed labels; ordered notes; fixed paragraph.

### TC-070 — OpenAI adapter contract

- References: FR-45; FR-51; T-24; A-10.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Use a fake SDK response/error; inspect arguments, output validation and usage mapping.
- Expected: Structured output, maxRetries 0, explicit non-strict schema, configured temperature/reasoning; safe mapped errors.

### TC-071 — Untrusted-text sanitization

- References: FR-19; FR-23; UT-21.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Run TRD §14.4 control, angle-bracket, newline, zero-width and NFC vectors.
- Expected: Exact normative sanitization.

### TC-072 — Exact prompts and rubric

- References: FR-19; FR-23; UT-22.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Compare system prompts to independent TRD fixtures; render each rubric/type and user message.
- Expected: Byte-exact copy, trusted/untrusted block order and matching versions.

### TC-073 — Feedback normalization

- References: FR-20–FR-23; UT-23.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Run invalid scores, empty fields, truncation, list limits, caps and rounding vectors.
- Expected: TRD §15.3 rejects invalid fields and applies deterministic caps.

### TC-074 — Quoted evidence verification

- References: FR-20; UT-24.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Try exact/normalised quotes, partial words, short and absent quotes.
- Expected: Only supported whole-word evidence survives; removed count accurate.

### TC-075 — Feedback retries and deadline

- References: FR-19; UT-25.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Use scripted providers for invalid, retryable, non-retryable and timeout paths with an injected clock.
- Expected: At most two attempts, bounded deadline, usage accumulated and exact error codes.

### TC-076 — Feedback API boundaries

- References: FR-19; FR-40–FR-45; FR-56; UT-33.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Submit missing/bad/expired/scoped tokens and invalid transcripts; exercise limiter and mock failures.
- Expected: Normative check order and error statuses, remaining calls, valid success response, TRD §20 log levels and no transcript in logs.

### TC-077 — Feedback card

- References: FR-20–FR-22; CT-03.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Render scores, all flags, evidence/null evidence and metadata.
- Expected: Accessible scores, exact copy, evidence only when present, disclaimer and metadata; TRD §19.2 bars use four 12 × 6 px segments, 2 px gaps and the specified tokens.

### TC-078 — Safe model and visitor text

- References: FR-23; NFR-10; CT-09.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Render HTML-like text and bracket placeholders.
- Expected: Literal text; no HTML execution; placeholders styled.

### TC-079 — Full feedback sessions

- References: FR-19; FR-26; FR-27; E2E-05; E2E-06.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Complete three text and mocked voice answers, edit and request feedback.
- Expected: Scored answers and retained edits reach the report, replacing D-58 staged assertions.

### TC-080 — Feedback errors and retry controls

- References: FR-26; FR-27; E2E-11.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Exercise timeout, invalid, provider error, quotas, slow response and save-without-feedback.
- Expected: Exact copy, allowed retry actions, remaining attempts, progress text and keyboard focus; blocking error H2 is announced assertively (NFR-08; TRD §19.4).

### TC-081 — Report aggregates

- References: FR-28–FR-30; UT-27.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Use scored, saved and skipped answers with ties and trend boundary values.
- Expected: Exact means, tie order, focus order, trend and delivery null handling.

### TC-082 — Summary generation

- References: FR-29; UT-26.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Return reordered, missing, unknown and invalid notes from a fake provider.
- Expected: Recomputed focus ordering; missing notes null; invalid required text fails.

### TC-083 — Summary API boundaries

- References: FR-29; FR-40–FR-45; UT-34.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Exercise token scope, third-call exhaustion, cap, readonly and success; inspect safe log fields and severity.
- Expected: Normative status, check order, validated response, TRD §20 log levels and the TRD §22 item count without answer content.

### TC-084 — Report states and chart

- References: FR-28–FR-32; CT-07; E2E-19.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Render completed/in-progress/no-scored reports, mixed statuses, summary states and fewer than two scores.
- Expected: Exact report copy and table; chart excludes unscored data and hides below two scores; visible touch targets meet 44 × 44 px (NFR-09; TRD §19.4).

### TC-085 — Summary retry and fallback

- References: FR-29; E2E-20.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Open report with eligible/no-token/offline/exhausted states and trigger errors.
- Expected: One eligible automatic call; fallback tips; retries only when permitted.

### TC-086 — Markdown export and print

- References: FR-32; UT-28; E2E-19.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Export malicious-looking text and saved/skipped answers; trigger print events.
- Expected: Escaped deterministic Markdown and filename; details open then restore; actions hidden in print.

### TC-087 — Static sample report

- References: FR-33; UT-40; E2E-21.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM, memory limiter, blocked external fetch; fake providers/clocks as applicable; speech mock for browser voice paths.
- Steps: Validate the sample; open /sample and inspect requests.
- Expected: Three seeded scored fictional answers, summary and valid export; no API/limiter/storage use; mock allowed only with explicit validation flag.

### TC-088 — Live model verification

- References: FR-19; T-24; A-01; A-02; A-03.
- Priority: High. Automatable: no.
- Preconditions: Owner-configured local live credentials; never paste or log secrets.
- Steps: Owner confirms model listing and runs one toy structured output request at temperature 0.
- Expected: Pinned model available, accepts settings and returns valid object; published prices recorded.

### TC-089 — Live feedback and token-size measurement

- References: FR-19; FR-56; T-27.
- Priority: High. Automatable: no.
- Preconditions: Owner-configured local live credentials; never paste or log secrets.
- Steps: Owner runs one local feedback request and inspects safe usage logs.
- Expected: Valid feedback; measured token sizes compared to TRD §23.2; update if >20% different.

### TC-090 — Live sample provenance

- References: FR-33; T-31.
- Priority: High. Automatable: no.
- Preconditions: Owner-configured local live credentials; never paste or log secrets.
- Steps: Owner runs sample:generate before release.
- Expected: Real model outputs validate without --allow-mock; no fictional output claimed as live.

## M4 — Local storage, history, import and export

| TC ID  | Reference                     | Title                                  | Priority | Automatable | Expected result                                                                                                                                |
| ------ | ----------------------------- | -------------------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-091 | FR-34; UT-12                  | IndexedDB lifecycle                    | High     | yes         | Exact schema; closed writes reject; blocked timeout keeps fallback and closes late connection; mismatched versions reject.                     |
| TC-092 | FR-34; UT-13                  | Repository parity                      | High     | yes         | Both implementations obey the same contract and isolate unrelated preferences.                                                                 |
| TC-093 | FR-34; D-20; UT-14            | Upgrade safety                         | High     | yes         | Data retained, by_role index present, migrated records validate without read-time writes.                                                      |
| TC-094 | FR-39; UT-12; E2E-23          | Storage selection and fallback         | High     | yes         | Stable memory fallback and cause-specific banner; session still completes.                                                                     |
| TC-095 | FR-35; E2E-16                 | Checkpoint reload recovery             | High     | yes         | Restored draft opens review; thinking shows Continue; scored feedback restored; no automatic resubmission.                                     |
| TC-096 | FR-35; NFR-14; TRD §11.3      | Write failures and persistence request | High     | yes         | State copied to memory; correct single banner; storage.persist requested only once after completion.                                           |
| TC-097 | FR-36; CT-08; E2E-17          | History list and navigation            | High     | yes         | Exact copy and columns; newest first; correct destination; empty and unreadable states.                                                        |
| TC-098 | FR-38; CT-08; E2E-17          | Confirmed deletion                     | High     | yes         | Cancel preserves data; deletion cascades; only rehearse preferences removed; one pending delete succeeds after unblock.                        |
| TC-099 | FR-37; UT-15; E2E-18          | Portable export and import             | High     | yes         | Tokens nulled, newest first, correct filename; imported origin, practice mode; duplicate counts; atomic bundles.                               |
| TC-100 | FR-37; NFR-18; UT-15; E2E-18  | Import validation and size budget      | High     | yes         | Exact errors; oversize rejected before reading; invalid bundles counted independently under owner-approved D-68; maximal session below 100 KB. |
| TC-101 | FR-35; T-33 manual acceptance | Physical voice reload                  | High     | no          | Review restores spoken draft and the exact restored notice.                                                                                    |

### TC-091 — IndexedDB lifecycle

- References: FR-34; UT-12.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Open version 1 and inspect stores/indexes; trigger versionchange and blocked open with a late success; mismatch versions.
- Expected: Exact schema; closed writes reject; blocked timeout keeps fallback and closes late connection; mismatched versions reject.

### TC-092 — Repository parity

- References: FR-34; UT-13.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Run CRUD, invalid records, timestamp/order, cascading delete and deleteAll against both repositories.
- Expected: Both implementations obey the same contract and isolate unrelated preferences.

### TC-093 — Upgrade safety

- References: FR-34; D-20; UT-14.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Create v1 records, close, upgrade with test v2 index and read-time record migration.
- Expected: Data retained, by_role index present, migrated records validate without read-time writes.

### TC-094 — Storage selection and fallback

- References: FR-39; UT-12; E2E-23.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Remove IndexedDB or fail/open-block it; finish a text session in memory.
- Expected: Stable memory fallback and cause-specific banner; session still completes.

### TC-095 — Checkpoint reload recovery

- References: FR-35; E2E-16.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Reload after a two-second text draft, during thinking, after review and feedback.
- Expected: Restored draft opens review; thinking shows Continue; scored feedback restored; no automatic resubmission.

### TC-096 — Write failures and persistence request

- References: FR-35; NFR-14; TRD §11.3.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Fail writes and trigger versionchange; complete a session twice.
- Expected: State copied to memory; correct single banner; storage.persist requested only once after completion.

### TC-097 — History list and navigation

- References: FR-36; CT-08; E2E-17.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Save two completed and one active session; inspect descending dates, scores and statuses; resume/open report.
- Expected: Exact copy and columns; newest first; correct destination; empty and unreadable states.

### TC-098 — Confirmed deletion

- References: FR-38; CT-08; E2E-17.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Cancel then confirm single/all deletion; block database deletion with another connection then release it.
- Expected: Cancel preserves data; deletion cascades; only rehearse preferences removed; one pending delete succeeds after unblock.

### TC-099 — Portable export and import

- References: FR-37; UT-15; E2E-18.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Export sessions, parse JSON, import into new store and repeat; check in-progress import.
- Expected: Tokens nulled, newest first, correct filename; imported origin, practice mode; duplicate counts; atomic bundles.

### TC-100 — Import validation and size budget

- References: FR-37; NFR-18; UT-15; E2E-18.
- Priority: High. Automatable: yes.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: Use malformed/newer/oversize files and invalid session bundles; serialise maximal five-question fixture.
- Expected: Exact errors; oversize rejected before reading; invalid bundles counted independently under owner-approved D-68; maximal session below 100 KB.

### TC-101 — Physical voice reload

- References: FR-35; T-33 manual acceptance.
- Priority: High. Automatable: no.
- Preconditions: Mock LLM/memory limiter; fake-indexeddb and injectable clocks for unit tests; unique browser data and mocked speech except the explicitly manual case.
- Steps: On Chrome with a real microphone reload during recording after a draft save.
- Expected: Review restores spoken draft and the exact restored notice.

## M5 Eval and CI (T-36–T-39)

| TC ID  | Reference                    | Title                                  | Priority | Automatable | Expected result                                                                                                                                    |
| ------ | ---------------------------- | -------------------------------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-102 | FR-48; UT-36                 | Golden corpus and question eligibility | High     | yes         | Exact examples preserved; valid distribution and eligible questions pass; malformed sets fail.                                                     |
| TC-103 | FR-48; UT-36                 | Golden triples and adversarial cases   | High     | yes         | Six complete triples and required edge cases pass; invalid fixtures fail.                                                                          |
| TC-104 | FR-49; UT-37                 | Eval quality metrics and gates         | High     | yes         | Normative ranges, monotonicity, canary resistance, flag accuracy, nearest-rank p95 and thresholds calculated correctly.                            |
| TC-105 | FR-49; UT-38                 | Eval budget protection                 | High     | yes         | Live zero prices and over-budget estimate refused before calls; overspend stops scheduling and writes failed partial results; mock bypasses guard. |
| TC-106 | FR-49; TRD §18.1, §18.6      | Eval runner and result contract        | High     | yes         | Mock run uses real feedback pipeline without external calls; results include metadata and failures; exit codes follow spec.                        |
| TC-107 | FR-49; T-37                  | Owner live eval                        | High     | no          | All thresholds pass; genuine live result committed as dated file and latest.json.                                                                  |
| TC-108 | FR-50; T-38; TRD §27.2       | Eval workflow controls                 | High     | no          | Relevant PR invokes budgeted eval; README-only PR does not trigger; fork skips paid job.                                                           |
| TC-109 | FR-40, FR-41, FR-46; E2E-12  | Feedback quota boundaries              | High     | yes         | Exact boundaries, status codes and practice fallback copy.                                                                                         |
| TC-110 | FR-42; E2E-13                | Global feedback cap                    | High     | yes         | First two succeed and third shows global cap copy.                                                                                                 |
| TC-111 | FR-44; E2E-14, E2E-15        | Read-only and disabled demo            | High     | yes         | Readonly/off banners and exact copy; no scoring; available pages remain usable.                                                                    |
| TC-112 | FR-55; E2E-22                | Offline review recovery                | High     | yes         | Offline banner and helper; scoring disabled offline and enabled online.                                                                            |
| TC-113 | NFR-08; E2E-24               | Keyboard flow and focus                | High     | yes         | Correct phase focus, operable controls and trapped dialog focus.                                                                                   |
| TC-114 | NFR-09; E2E-25               | Responsive layouts                     | High     | yes         | No horizontal overflow.                                                                                                                            |
| TC-115 | FR-53; E2E-26                | Theme persistence before paint         | High     | yes         | System preference applied; explicit preference persists and is set before paint.                                                                   |
| TC-116 | NFR-13; E2E-27               | Security headers and nonces            | High     | yes         | Fresh nonce each response, script nonce match and required headers.                                                                                |
| TC-117 | TRD §12; E2E-28              | API boundary errors                    | High     | yes         | Exact specified status/code and health shape.                                                                                                      |
| TC-119 | FR-50; TRD §27.2; D-46; T-38 | Eval workflow specification            | High     | yes         | Normative triggers, fork guard, budget and artifacts, with approved action majors.                                                                 |
| TC-118 | NFR-08; E2E-30               | Existing page accessibility            | High     | yes         | Zero serious or critical violations; later marketing pages deferred to T-41.                                                                       |

### TC-102 — Golden corpus and question eligibility

- References: FR-48; UT-36.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Validate all 24 items and compare the six normative examples; mutate counts, IDs, active status and eligibility.
- Expected: Exact examples preserved; valid distribution and eligible questions pass; malformed sets fail.

### TC-103 — Golden triples and adversarial cases

- References: FR-48; UT-36.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Break triple membership, question consistency, canaries, off-topic ranges and short-answer length.
- Expected: Six complete triples and required edge cases pass; invalid fixtures fail.

### TC-104 — Eval quality metrics and gates

- References: FR-49; UT-37.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Evaluate synthetic successful and failed calls across repeats, flags, strings and latencies.
- Expected: Normative ranges, monotonicity, canary resistance, flag accuracy, nearest-rank p95 and thresholds calculated correctly.

### TC-105 — Eval budget protection

- References: FR-49; UT-38.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Use fake providers and prices to test preflight estimate, zero prices and running overspend.
- Expected: Live zero prices and over-budget estimate refused before calls; overspend stops scheduling and writes failed partial results; mock bypasses guard.

### TC-106 — Eval runner and result contract

- References: FR-49; TRD §18.1, §18.6.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Run mock CLI with repeat, subset, output and gate options; inspect validated output.
- Expected: Mock run uses real feedback pipeline without external calls; results include metadata and failures; exit codes follow spec.

### TC-107 — Owner live eval

- References: FR-49; T-37.
- Priority: High. Automatable: no.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Owner runs full live eval with configured prices and budget and reviews results.
- Expected: All thresholds pass; genuine live result committed as dated file and latest.json.

### TC-108 — Eval workflow controls

- References: FR-50; T-38; TRD §27.2.
- Priority: High. Automatable: no.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Inspect workflow and exercise same-repo prompt PR, README-only PR and fork PR.
- Expected: Relevant PR invokes budgeted eval; README-only PR does not trigger; fork skips paid job.

### TC-109 — Feedback quota boundaries

- References: FR-40, FR-41, FR-46; E2E-12.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Exercise session/IP/token quotas with unique IPs and UI error routes.
- Expected: Exact boundaries, status codes and practice fallback copy.

### TC-110 — Global feedback cap

- References: FR-42; E2E-13.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Use isolated server with cap two; submit three feedback requests.
- Expected: First two succeed and third shows global cap copy.

### TC-111 — Read-only and disabled demo

- References: FR-44; E2E-14, E2E-15.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Open alternate servers, save practice answers, seed active session and inspect API responses.
- Expected: Readonly/off banners and exact copy; no scoring; available pages remain usable.

### TC-112 — Offline review recovery

- References: FR-55; E2E-22.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Toggle offline during review then reconnect.
- Expected: Offline banner and helper; scoring disabled offline and enabled online.

### TC-113 — Keyboard flow and focus

- References: NFR-08; E2E-24.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Complete text session using keyboard and test dialog Escape/focus trap.
- Expected: Correct phase focus, operable controls and trapped dialog focus.

### TC-114 — Responsive layouts

- References: NFR-09; E2E-25.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Inspect existing pages and room phases at 360×740 and 1024×768.
- Expected: No horizontal overflow.

### TC-115 — Theme persistence before paint

- References: FR-53; E2E-26.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Use system dark, toggle theme and reload.
- Expected: System preference applied; explicit preference persists and is set before paint.

### TC-116 — Security headers and nonces

- References: NFR-13; E2E-27.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Compare two response nonces and inspect script tags and response headers.
- Expected: Fresh nonce each response, script nonce match and required headers.

### TC-117 — API boundary errors

- References: TRD §12; E2E-28.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Send invalid origin, MIME, size, token, scope and transcript requests.
- Expected: Exact specified status/code and health shape.

### TC-118 — Existing page accessibility

- References: NFR-08; E2E-30.
- Priority: High. Automatable: yes.
- Preconditions: Mock provider and memory limiter for automated checks; unique browser IP/data and mocked speech. Live eval and workflow acceptance require owner configuration.
- Steps: Run axe on setup, room phases/errors, report, empty/filled history and sample in both themes.
- Expected: Zero serious or critical violations; later marketing pages deferred to T-41.

### TC-119 — Eval workflow specification

- References: FR-50; TRD §27.2; D-46; T-38.
- Priority: High. Automatable: yes.
- Preconditions: Repository workflow source; no network or credentials.
- Steps: Compare workflow with the normative YAML, applying the approved action major versions; inspect path exclusions, fork guard, budget environment and artifact handling.
- Expected: Workflow preserves the specified triggers, fork protection, budget and artifacts. Actual paid workflow acceptance remains TC-108.
