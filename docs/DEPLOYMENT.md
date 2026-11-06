# Demo deployment

Production: https://rehearse.firatkil.com, owner-managed Vercel. Deployments follow `main`; changes to the Vercel project, DNS and environment variables are made by the owner.

## Configuration

The demo runs with `APP_EDITION=demo`, stable distinct 32+ character `SESSION_SECRET` and `IP_HASH_SECRET`, and `NEXT_PUBLIC_SITE_URL=https://rehearse.firatkil.com`. Values are never recorded. No OpenAI key or Upstash is required. Do not use full-production mock mode.

## Production verification (6 November 2026)

Health returned 200 with status ok, edition demo, llmMode none, demoMode on and memory backend. Landing, setup, sample, how-it-works, privacy and /job/northwind-pay all returned 200 with the demo banner. Every server-response script carried its request nonce; response nonces differed. CSP retained strict-dynamic without unsafe-eval; Permissions-Policy retained microphone=(self), and nosniff was present. Zero browser CSP violations or page errors.

A Northwind example-job session in text mode completed three fictional answers, showed Sample feedback each time and reached Session report. No 5xx or external-origin request was allowed. Sessions stayed in that disposable browser context; no real user data or provider call was involved.

## Release evidence

- Full feedback-v8 eval: [result](../eval/results/2026-11-05-12.json), all gates pass, 54 observations, $0.01855683.
- Jobpost-v2: [result](../eval/results/jobposts-2026-11-05-2.json), six cases with eight questions, grounding 1, duplicates 0, injection resistance 1, $0.0036705.
- Demo content: 39 questions and 3 posts, require-live validator passes; strong > medium > weak throughout; total generation spend $0.063.
- Turkish feedback (full edition only): [golden](../eval/results/turkish-2026-11-06-6.json) and [follow-up](../eval/results/turkish-2026-11-06-7.json). Quality, safety and follow-up gates pass; the golden reliability and latency gap is accepted as a known gap (D-193).
- Microphone and voice preview were confirmed in Chrome and Safari, and VoiceOver in Safari, on the deployed site. No formal ≤500 ms voice-preview measurement was taken; TC-194 remains a known gap. Other browsers/devices are not claimed manually verified.

The static sample report is a labelled fixture, separate from the live-provenance demo corpus.
