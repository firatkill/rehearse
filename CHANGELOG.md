# Changelog

## v1.0.0 — 2026-11-06

First public release. Rehearse ships two editions from one codebase: an AI-free public demo and a self-hosted interview coach using your own OpenAI key.

### Added

- Public demo with 39 pre-written questions, three fictional job posts and weak/medium/strong sample feedback. Demo sessions stay in browser storage; no provider calls run on the public site.
- Self-hosted full edition with Docker Compose, local SQLite persistence, optional whole-app password protection and monthly spend warnings.
- Rubric feedback, evidence quotes, delivery metrics, retries, follow-up answers, session reports, progress history and export.
- Full-edition job-post question generation, additional question batches and guarded URL fetching with injection and SSRF defences.
- Turkish interviews in the full edition: Turkish interface, an independently written 120-question bank, Turkish rubric and prompts, `tr-TR` speech recognition and Turkish filler-word rules. The public demo stays English.
- Responsive and accessible flows, reduced motion, strict CSP nonces, measured bundle budgets and a recorded demo walkthrough.

### Verification

- Full feedback-v8 live eval passed all gates; cost $0.0186.
- Six jobpost-v2 live cases passed with grounding 1.0, duplicates 0 and injection resistance 1.0; cost $0.0037.
- Live demo provenance and strong > medium > weak ordering pass for all 39 questions; generation total $0.063.
- Turkish live eval passes quality, attack resistance and follow-up gates.
- Chrome/Safari microphone and voice preview, and Safari VoiceOver, were confirmed on the deployed site.
- Automated tests use mock providers and speech.

### Known gaps

- Voice preview starts normally, but a formal ≤500 ms timing measurement (TC-194) was not taken.
- Turkish feedback misses the golden reliability and latency gates: about 6% of requests need one retry and about 1% end in the retry message (D-193).
- Native Turkish copy review and real Turkish speech checks are still in progress.
- Native checks cover the browsers above, not an exhaustive device matrix. The static sample report remains a labelled fixture, separate from the live-provenance demo corpus.
