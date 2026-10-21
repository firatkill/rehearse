# M0 Setup — QA report

Date: 2026-10-21. Scope: T-01–T-05. Sources: [case design](test-cases.md), [append-only results](test-results.json), [progress](../docs/PROGRESS.md).

## Delivered

Pinned Next.js/React/TypeScript tooling, authorship hook, public repository and five CI jobs; strict environment validation; request validation, structured log redaction and nonce-based security headers; unit/component and four-server browser runners; design tokens, self-hosted fonts, shell, theme persistence, banners, error pages and announcement queue.

The home page is a scaffold. Interview flows, navigation destinations, storage, feedback, question content and evaluation are later milestones. The health route and eval command are the explicit T-04 placeholders.

## Verification

- Lint, typecheck, production build and mock eval stub pass.
- 36 unit/component tests pass; configured lib coverage is 100% lines, 100% functions and 96% branches, above 80/80/75 thresholds.
- Eight Chromium E2E tests pass with four workers. Four health servers use mock LLM and memory rate limiting.
- Shell checks cover keyboard skip focus, widths 360 and 1024 px, dark/light persistence, banners, 404, script nonces and axe in both themes (zero serious/critical findings).
- T-03 HTTP checks used port 3100 because port 3000 was occupied; fresh nonces appeared on every script across two responses.
- CI through T-04: https://github.com/firatkill/rehearse/actions/runs/39565447187. T-05 all five jobs passed: https://github.com/firatkill/rehearse/actions/runs/39566353571.

## Resolved

| Case   | Title                                                     | Result                       |
| ------ | --------------------------------------------------------- | ---------------------------- |
| TC-001 | Pinned tooling installs, lints, typechecks and builds     | Passed; see ledger attempts. |
| TC-002 | CI skeleton passes on GitHub                              | Passed; see ledger attempts. |
| TC-003 | Environment defaults and conditional requirements         | Passed; see ledger attempts. |
| TC-004 | Production rejects development backends                   | Passed; see ledger attempts. |
| TC-005 | Secrets differ and validation does not expose values      | Passed; see ledger attempts. |
| TC-006 | Example variable inventory matches TRD                    | Passed; see ledger attempts. |
| TC-007 | Request boundaries reject invalid bodies and origins      | Passed; see ledger attempts. |
| TC-008 | Structured logging redacts sensitive fields               | Passed; see ledger attempts. |
| TC-009 | Production responses carry fresh CSP and security headers | Passed; see ledger attempts. |
| TC-010 | Unit and component runners, coverage and four E2E servers | Passed; see ledger attempts. |
| TC-011 | Full CI skeleton passes                                   | Passed; see ledger attempts. |
| TC-012 | Announcer suppresses duplicates and limits queue          | Passed; see ledger attempts. |
| TC-013 | Theme persists across reload                              | Passed; see ledger attempts. |
| TC-014 | Layout shell and keyboard skip link                       | Passed; see ledger attempts. |
| TC-015 | Banners and error-page copy                               | Passed; see ledger attempts. |

## Pending decision

No unresolved implementation decisions. TypeScript compatibility and shadcn runtime support packages were explicitly approved and recorded in D-47/D-49. Other verified assumptions are in D-44–D-50.

## Manual test required and verification limits

The owner still needs to enable Dependabot alerts in GitHub settings. Secret scanning and push protection were verified enabled. This is tracked in PROGRESS.md.

No real microphone, speech engine, Safari, screen reader, live LLM, Upstash or deployed environment was tested. Those checks belong to later tasks; automated shell accessibility checks are not a full WCAG audit. CI and browser tests use mocks and do not incur LLM costs. No production deployment was created.

## Regressions and retractions

None. No case or failed attempt was removed; no test was weakened, skipped or deleted.

## Root causes

No shared product-defect cluster. Bootstrap issues involved npm cache ownership, pnpm launcher compatibility and generated component dependencies. T-04 required lint compatibility for the verbatim normative mock and corrections to test wiring. T-05 axe findings (missing title and colour-only links) were fixed and passed affected retests, then the full suite.

## Requirement coverage

| Reference                    | M0 result                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| T-01–T-04 acceptance; NFR-17 | Local tooling, validation and CI setup verified by TC-001–TC-011; T-05 CI also passed.                                                    |
| FR-44, FR-51; UT-30          | Environment boundary portion verified by TC-003–TC-006; actual demo APIs are later tasks.                                                 |
| FR-56, NFR-13                | M0 logger, request and CSP portions verified by TC-005, TC-007–TC-009. Full product security remains later scope.                         |
| FR-53; E2E-26                | Theme persistence verified by TC-013.                                                                                                     |
| NFR-08; CT-06                | Announcer timing verified by TC-012; shell keyboard/axe by TC-014. Real assistive-technology and complete flow checks remain later scope. |
| NFR-09; PRD 9.1              | Shell at 360/1024 px and room-header variant verified by TC-014.                                                                          |
| PRD 9.2, 9.13                | Banner rendering/order, offline events, error-boundary copy and 404 verified by TC-015. Storage-event wiring belongs to M5.               |

## Milestone review

1. Ledger integrity: all 15 designed cases are recorded; append-only checker passed before closeout.
2. Coverage: every M0 case has an executed check. Requirement claims above are restricted to milestone scope.
3. Automation: all 15 automatable cases are implemented as tests or executable acceptance/CI checks. No designed manual M0 case was silently marked automated.
4. Retesting: failed cases end with genuine passing retests; T-05 also passed a final full suite.
5. Escalations: none pending for product code; owner GitHub setting is tracked locally under the repository override.
6. Manual checks: no physical speech or screen-reader pass claimed. Owner setting remains open.
7. Audit trail: no retractions or deletions.
8. Attempt advisory: TC-001 has four distinct bootstrap failures, each addressed; no recurring product failure remains.
9. Process improvement: invoke the pinned pnpm launcher directly in this environment, format after lint autofixes, and typecheck test fixtures before browser runs. No QA skill modification was required.

Verdict: M0 implementation and CI verified. Ready to close with the explicit owner-settings and later-milestone verification limits above. Stop before T-06 for owner review.
