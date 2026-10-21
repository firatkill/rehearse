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
