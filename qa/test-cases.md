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
