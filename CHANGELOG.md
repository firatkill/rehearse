# Changelog

## v2.0.0 — 2026-11-06

Rehearse now ships two editions from one codebase: an AI-free public demo and a self-hosted interview coach using your own OpenAI key.

### Added

- Public demo with 39 pre-written questions, three fictional job posts and weak/medium/strong sample feedback. Demo sessions stay in browser storage; no provider calls run on the public site.
- Self-hosted full edition with Docker Compose, local SQLite persistence, optional whole-app password protection and monthly spend warnings.
- Rubric feedback, evidence quotes, delivery metrics, retries, follow-up answers, session reports, history and export.
- Full-edition job-post question generation, additional question batches and guarded URL fetching with injection and SSRF defences.
- Responsive and accessible flows, reduced motion, strict CSP nonces, measured bundle budgets and a recorded demo walkthrough.

### Corrected before final release

- Applied the owner’s design polish across setup, job posts, room and reports.
- Replaced staged preview copy with shipped demo/full capabilities and accurate storage, provider and budget disclosures; Turkish remains future work.

### Verification

- Full feedback-v8 live eval passed all gates; owner cost $0.0186.
- Six jobpost-v2 live cases passed with grounding 1.0, duplicates 0 and injection resistance 1.0; owner cost $0.0037.
- Live demo provenance and strong > medium > weak ordering pass for all 39 questions; owner generation total $0.063.
- Owner confirmed Chrome/Safari microphone and voice preview, and Safari VoiceOver. Read-only production checks covered public pages, sample report, a complete demo job session and security headers.
- Automated tests use mock providers and speech. No paid calls were made for release preparation.

### Known gaps

- Voice preview starts normally, but a formal ≤500 ms timing measurement (TC-194) was not taken.
- Native checks cover the owner-tested browsers above, not an exhaustive device matrix. The static sample report remains a labelled fixture, separate from the live-provenance demo corpus.
- Turkish interviews are not part of v2.0.0.
