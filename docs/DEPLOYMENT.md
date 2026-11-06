# Demo deployment

Production: https://rehearse.firatkil.com, owner-managed Vercel. V-52 verification on 6 November 2026 (00:16 UTC), commit `8441dd0`, Chromium 156.0.8078.4. No project/DNS/env changes.

Health returned 200 with status ok, edition demo, llmMode none, demoMode on and memory backend. Landing, setup, sample, how-it-works, privacy and /job/northwind-pay all returned 200 with the demo banner. Every server-response script carried its request nonce; response nonces differed. CSP retained strict-dynamic without unsafe-eval; Permissions-Policy retained microphone=(self), and nosniff was present. Zero browser CSP violations or page errors.

A Northwind example-job session in text mode completed three fictional answers, showed Sample feedback each time and reached Session report. No 5xx or external-origin request was allowed. Sessions stayed in that disposable browser context; no real user data or provider call was involved. The rendered report was inspected locally.

## Configuration

The owner has APP_EDITION=demo, stable distinct 32+ character SESSION_SECRET and IP_HASH_SECRET, and NEXT_PUBLIC_SITE_URL=https://rehearse.firatkil.com. Values are never recorded. No OpenAI key or Upstash is required. Do not use full-production mock mode. Deployments follow main; changes to Vercel/DNS/env remain owner-controlled.

## Owner release evidence

- Full feedback-v8 eval: [result](../eval/results/2026-11-05-12.json), all gates pass, 54 observations, $0.01855683. Closes the first-live-use/release full-eval checkpoint.
- Jobpost-v2 after #38: [result](../eval/results/jobposts-2026-11-05-2.json), six cases with eight questions, grounding 1, duplicates 0, injection resistance 1, $0.0036705.
- Demo content: PR #39, 39 questions and 3 posts, require-live validator passes; strong > medium > weak throughout; total owner generation spend $0.063.
- Owner confirmed Chrome/Safari microphone and voice preview, and Safari VoiceOver, on the deployed site. No formal ≤500 ms voice-preview measurement was taken; TC-194 remains a known gap. Other browsers/devices are not claimed manually verified.

All live work above was run by the owner. V-52 made no paid calls. The static sample report is a labelled fixture, separate from the live-provenance demo corpus. Rollback/toggle experiments were not performed because the owner authorised read-only production verification only.

## v2.0.0 production recheck

After PR #41 merged, health returned 200 at commit `600b814`, version 2.0.0, edition demo and llmMode none. The six public routes, fresh script nonces and a complete three-question Northwind text session passed again with Sample feedback/report and zero CSP violations, page errors or 5xx. Main CI 42138583562 passed before tagging and publishing v2.0.0. No hosting settings changed.

## Final v2.0.0 replacement

Owner-approved replacement after PR #42 and #43: final tag target bf7a19e, main CI 42143969315 green. Production health reports 2.0.0/demo/none at that commit. Landing/how-it-works/privacy contain shipped edition copy and explicit demo transient-processing disclosure; six public routes, strict headers and a complete three-answer sample session pass without CSP/page/5xx errors. The original 600b814 publication above is historical. No Vercel/DNS/env changes or paid calls.
